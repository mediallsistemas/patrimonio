import { describe, it, expect, vi, beforeEach } from 'vitest'

// Prisma mockado — valida a FORMA do where na listagem, em especial a
// composição status × atrasados (bug de spread que sobrescrevia o status).
vi.mock('@/lib/db', () => ({
  prisma: {
    chamado: { findMany: vi.fn() },
  },
}))

import { prisma } from '@/lib/db'
import { listar } from './chamados-query.service'

const findMany = vi.mocked(prisma.chamado.findMany)
const ESCOPO = { tenantId: 'tenant-1' }

beforeEach(() => {
  vi.clearAllMocks()
  findMany.mockResolvedValue([] as never)
})

describe('listar — composição de filtros', () => {
  it('status sozinho filtra pelo status pedido', async () => {
    await listar(ESCOPO, 'operator', { status: 'finalizado' })
    const where = findMany.mock.calls[0][0]!.where as Record<string, unknown>
    expect(where.status).toBe('finalizado')
    expect(where.tenantId).toBe('tenant-1')
  })

  it('atrasados sozinho restringe a status vivos com prazo vencido', async () => {
    await listar(ESCOPO, 'operator', { atrasados: true })
    const where = findMany.mock.calls[0][0]!.where as Record<string, unknown>
    expect(where.status).toEqual({ in: ['aberto', 'em_execucao'] })
    expect(where.prazo).toHaveProperty('lt')
  })

  it('status vivo + atrasados faz a INTERSECÇÃO (não sobrescreve o status)', async () => {
    await listar(ESCOPO, 'operator', { status: 'aberto', atrasados: true })
    const where = findMany.mock.calls[0][0]!.where as Record<string, unknown>
    expect(where.status).toBe('aberto')
    expect(where.prazo).toHaveProperty('lt')
  })

  it('status terminal + atrasados é combinação impossível → lista vazia sem query', async () => {
    const r = await listar(ESCOPO, 'operator', { status: 'finalizado', atrasados: true })
    expect(r).toEqual([])
    expect(findMany).not.toHaveBeenCalled()
  })

  it('sanitiza campos fiscais para operador', async () => {
    // Sem filtro são duas consultas (vivos e terminais); só a primeira devolve.
    findMany
      .mockResolvedValueOnce([
        {
          id: 'c1',
          status: 'aberto',
          prazo: new Date('2099-01-01'),
          fornecedor: 'MEGA',
          numeroOrdemCompra: 'OC-1',
          valorGastoCentavos: 100,
        },
      ] as never)
      .mockResolvedValueOnce([] as never)

    const [item] = await listar(ESCOPO, 'operator', {})
    expect(item).not.toHaveProperty('fornecedor')
    expect(item).not.toHaveProperty('valorGastoCentavos')
    expect(item).toHaveProperty('atrasado', false)
  })
})

// A importação do Trílogo traz histórico concluído junto. Sem esta separação, o
// `orderBy status asc` anterior era ordem alfabética — 'cancelado' vinha logo
// depois de 'aberto', na frente de 'em_execucao', e o `take` cortava por essa
// mesma ordem, empurrando chamados vivos para fora da lista.
describe('listar — ordem da fila', () => {
  const vivo = { id: 'v1', status: 'aberto', prazo: new Date('2099-01-01') }
  const terminal = { id: 't1', status: 'finalizado', prazo: new Date('2020-01-01') }

  it('sem filtro, separa vivos de terminais em duas consultas', async () => {
    findMany.mockResolvedValueOnce([vivo] as never).mockResolvedValueOnce([terminal] as never)
    await listar(ESCOPO, 'operator', {})

    expect(findMany).toHaveBeenCalledTimes(2)
    expect(findMany.mock.calls[0][0]!.where).toMatchObject({
      status: { in: ['aberto', 'em_execucao'] },
    })
    expect(findMany.mock.calls[1][0]!.where).toMatchObject({
      status: { in: ['finalizado', 'cancelado'] },
    })
  })

  it('os terminais vêm depois dos vivos', async () => {
    findMany.mockResolvedValueOnce([vivo] as never).mockResolvedValueOnce([terminal] as never)
    const r = await listar(ESCOPO, 'operator', {})
    expect(r.map((c) => c.id)).toEqual(['v1', 't1'])
  })

  it('cada lado tem seu próprio teto — histórico não espreme o que pede trabalho', async () => {
    findMany.mockResolvedValue([] as never)
    await listar(ESCOPO, 'operator', {})
    expect(findMany.mock.calls[0][0]!.take).toBe(200)
    expect(findMany.mock.calls[1][0]!.take).toBe(100)
  })

  it('terminais saem do mais recente para o mais antigo', async () => {
    findMany.mockResolvedValue([] as never)
    await listar(ESCOPO, 'operator', {})
    expect(findMany.mock.calls[1][0]!.orderBy).toEqual([
      { finalizadoEm: 'desc' },
      { criadoEm: 'desc' },
    ])
  })

  it('com filtro de status explícito volta a ser uma consulta só', async () => {
    findMany.mockResolvedValue([] as never)
    await listar(ESCOPO, 'operator', { status: 'finalizado' })
    expect(findMany).toHaveBeenCalledTimes(1)
  })
})
