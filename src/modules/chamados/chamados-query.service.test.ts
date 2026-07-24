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
    findMany.mockResolvedValue([
      {
        id: 'c1',
        status: 'aberto',
        prazo: new Date('2099-01-01'),
        fornecedor: 'MEGA',
        numeroOrdemCompra: 'OC-1',
        valorGastoCentavos: 100,
      },
    ] as never)
    const [item] = await listar(ESCOPO, 'operator', {})
    expect(item).not.toHaveProperty('fornecedor')
    expect(item).not.toHaveProperty('valorGastoCentavos')
    expect(item).toHaveProperty('atrasado', false)
  })
})
