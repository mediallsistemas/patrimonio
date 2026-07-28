import { describe, it, expect, vi, beforeEach } from 'vitest'

// Prisma mockado — o que interessa aqui é a FORMA do where. As duas leituras
// abaixo consultavam por trilogoAssetId / id sem nenhum filtro de unidade, e
// como os ids de bem do Trílogo são inteiros sequenciais de uma instância
// compartilhada, dava para enumerar as manutenções dos outros hospitais.
vi.mock('@/lib/db', () => ({
  prisma: {
    manutencaoRealizada: { findMany: vi.fn(), findFirst: vi.fn() },
  },
}))

import { prisma } from '@/lib/db'
import { listarRealizadasPorAssets, buscarRealizadaComFotos } from './manutencoes.service'

const findMany = vi.mocked(prisma.manutencaoRealizada.findMany)
const findFirst = vi.mocked(prisma.manutencaoRealizada.findFirst)

beforeEach(() => {
  vi.clearAllMocks()
  findMany.mockResolvedValue([] as never)
  findFirst.mockResolvedValue(null as never)
})

describe('listarRealizadasPorAssets', () => {
  it('restringe à unidade do solicitante', async () => {
    await listarRealizadasPorAssets([1, 2], { global: false, tenantIds: ['h1'] })
    const where = findMany.mock.calls[0][0]!.where as Record<string, unknown>
    expect(where.tenantId).toBe('h1')
    expect(where.trilogoAssetId).toEqual({ in: [1, 2] })
  })

  it('multiunidade enxerga as unidades vinculadas — e só elas', async () => {
    await listarRealizadasPorAssets([1], { global: false, tenantIds: ['h1', 'h2'] })
    const where = findMany.mock.calls[0][0]!.where as Record<string, unknown>
    expect(where.tenantId).toEqual({ in: ['h1', 'h2'] })
  })

  it('super_admin permanece cross-tenant', async () => {
    await listarRealizadasPorAssets([1], { global: true })
    const where = findMany.mock.calls[0][0]!.where as Record<string, unknown>
    expect(where).not.toHaveProperty('tenantId')
  })

  it('escopo sem unidade não devolve nada de ninguém', async () => {
    await listarRealizadasPorAssets([1, 2, 3], { global: false, tenantIds: [] })
    const where = findMany.mock.calls[0][0]!.where as Record<string, unknown>
    expect(where.tenantId).toEqual({ in: [] })
  })

  it('lista vazia de bens não consulta o banco', async () => {
    const r = await listarRealizadasPorAssets([], { global: false, tenantIds: ['h1'] })
    expect(r).toEqual([])
    expect(findMany).not.toHaveBeenCalled()
  })
})

describe('buscarRealizadaComFotos', () => {
  it('só encontra a manutenção dentro do escopo — fotos são o dado sensível', async () => {
    await buscarRealizadaComFotos('m1', { global: false, tenantIds: ['h1'] })
    const where = findFirst.mock.calls[0][0]!.where as Record<string, unknown>
    expect(where.id).toBe('m1')
    expect(where.tenantId).toBe('h1')
  })

  it('super_admin abre qualquer uma', async () => {
    await buscarRealizadaComFotos('m1', { global: true })
    const where = findFirst.mock.calls[0][0]!.where as Record<string, unknown>
    expect(where).toEqual({ id: 'm1' })
  })

  it('escopo sem unidade não abre nenhuma', async () => {
    await buscarRealizadaComFotos('m1', { global: false, tenantIds: [] })
    const where = findFirst.mock.calls[0][0]!.where as Record<string, unknown>
    expect(where.tenantId).toEqual({ in: [] })
  })
})
