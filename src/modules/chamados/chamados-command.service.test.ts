import { describe, it, expect, vi, beforeEach } from 'vitest'

// Prisma mockado — testes do serviço sem banco. O que validamos aqui é a
// FORMA das queries: isolamento de tenant no where, status de origem nas
// transições e IDs vindos dos argumentos (JWT), nunca do input.
vi.mock('@/lib/db', () => ({
  prisma: {
    chamado: {
      create: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    ambienteTenant: { findFirst: vi.fn() },
    usuario: { findFirst: vi.fn() },
  },
}))

import { prisma } from '@/lib/db'
import * as commands from './chamados-command.service'
import type { CriarChamadoInput } from './chamados.types'

const TENANT = 'tenant-1'
const USER = 'user-1'
const CHAMADO = 'chamado-1'

const mocks = {
  create: vi.mocked(prisma.chamado.create),
  updateMany: vi.mocked(prisma.chamado.updateMany),
  update: vi.mocked(prisma.chamado.update),
  findFirst: vi.mocked(prisma.chamado.findFirst),
  ambiente: vi.mocked(prisma.ambienteTenant.findFirst),
  usuario: vi.mocked(prisma.usuario.findFirst),
}

const inputCriar: CriarChamadoInput = {
  titulo: 'Vazamento',
  descricao: 'Vazamento na pia',
  tipo: 'hidraulica',
  prioridade: 'media',
  prazo: new Date('2026-08-01'),
  ambienteId: 'amb-1',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('criar', () => {
  it('grava snapshot do ambiente e criadoPorId do argumento (JWT)', async () => {
    mocks.ambiente.mockResolvedValue({
      id: 'amb-1',
      nome: 'CME',
      bloco: { nome: 'Bloco A' },
    } as never)
    mocks.create.mockResolvedValue({ id: CHAMADO } as never)

    await commands.criar(TENANT, USER, inputCriar)

    // Ambiente resolvido dentro do tenant
    expect(mocks.ambiente).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'amb-1', tenantId: TENANT, ativo: true }),
      }),
    )
    const data = mocks.create.mock.calls[0][0].data as Record<string, unknown>
    expect(data.tenantId).toBe(TENANT)
    expect(data.criadoPorId).toBe(USER)
    expect(data.ambienteNomeSnapshot).toBe('CME')
    expect(data.blocoNomeSnapshot).toBe('Bloco A')
    expect(data.status).toBeUndefined() // default 'aberto' do schema
  })

  it('falha se o ambiente não pertence ao tenant', async () => {
    mocks.ambiente.mockResolvedValue(null as never)
    await expect(commands.criar(TENANT, USER, inputCriar)).rejects.toThrow('ambiente')
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('atribuição direta valida o responsável no tenant e abre em execução', async () => {
    mocks.ambiente.mockResolvedValue({ id: 'amb-1', nome: 'CME', bloco: null } as never)
    mocks.usuario.mockResolvedValue({ id: 'resp-1' } as never)
    mocks.create.mockResolvedValue({ id: CHAMADO } as never)

    await commands.criar(TENANT, USER, inputCriar, {
      responsavelId: 'resp-1',
      atribuidoPorId: USER,
    })

    expect(mocks.usuario).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'resp-1', tenantId: TENANT, ativo: true }),
      }),
    )
    const data = mocks.create.mock.calls[0][0].data as Record<string, unknown>
    expect(data.status).toBe('em_execucao')
    expect(data.responsavelId).toBe('resp-1')
    expect(data.atribuidoPorId).toBe(USER)
  })

  it('atribuição direta com responsável de outro tenant falha', async () => {
    mocks.ambiente.mockResolvedValue({ id: 'amb-1', nome: 'CME', bloco: null } as never)
    mocks.usuario.mockResolvedValue(null as never)

    await expect(
      commands.criar(TENANT, USER, inputCriar, { responsavelId: 'intruso', atribuidoPorId: USER }),
    ).rejects.toThrow('responsável')
    expect(mocks.create).not.toHaveBeenCalled()
  })
})

describe('assumir', () => {
  it('só transiciona a partir de aberto, escopado ao tenant, responsável = quem assume', async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 } as never)
    mocks.findFirst.mockResolvedValue({ id: CHAMADO } as never)

    await commands.assumir(CHAMADO, { tenantId: TENANT }, USER, { prioridade: 'alta' })

    const call = mocks.updateMany.mock.calls[0][0]
    expect(call.where).toMatchObject({ id: CHAMADO, status: 'aberto', tenantId: TENANT })
    expect(call.data).toMatchObject({
      status: 'em_execucao',
      responsavelId: USER,
      prioridade: 'alta',
    })
  })

  it('retorna null quando já foi assumido (corrida) ou não é do tenant', async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 } as never)
    const r = await commands.assumir(CHAMADO, { tenantId: TENANT }, USER, {})
    expect(r).toBeNull()
    expect(mocks.findFirst).not.toHaveBeenCalled()
  })
})

describe('finalizar', () => {
  it('aceita aberto e em_execucao como origem; finalizadoPorId do argumento', async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 } as never)
    mocks.findFirst.mockResolvedValue({ id: CHAMADO } as never)

    await commands.finalizar(CHAMADO, { tenantId: TENANT }, USER, {
      descricaoExecucao: 'Consertado o vazamento',
    })

    const call = mocks.updateMany.mock.calls[0][0]
    expect(call.where).toMatchObject({
      id: CHAMADO,
      status: { in: ['aberto', 'em_execucao'] },
      tenantId: TENANT,
    })
    expect(call.data).toMatchObject({ status: 'finalizado', finalizadoPorId: USER })
  })

  it('não finaliza chamado já finalizado/cancelado', async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 } as never)
    const r = await commands.finalizar(CHAMADO, { tenantId: TENANT }, USER, {
      descricaoExecucao: 'tentativa',
    })
    expect(r).toBeNull()
  })
})

describe('atribuir', () => {
  it('valida responsável no tenant DO CHAMADO (cross-tenant do super_admin)', async () => {
    mocks.findFirst.mockResolvedValueOnce({ id: CHAMADO, tenantId: 'tenant-do-chamado' } as never)
    mocks.usuario.mockResolvedValue({ id: 'resp-1' } as never)
    mocks.update.mockResolvedValue({ id: CHAMADO } as never)

    // super_admin: escopo sem tenant
    await commands.atribuir(CHAMADO, { tenantId: null }, 'admin-1', { responsavelId: 'resp-1' })

    expect(mocks.usuario).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'resp-1', tenantId: 'tenant-do-chamado' }),
      }),
    )
    const call = mocks.update.mock.calls[0][0]
    expect(call.data).toMatchObject({
      status: 'em_execucao',
      responsavelId: 'resp-1',
      atribuidoPorId: 'admin-1',
    })
  })

  it('retorna null para responsável inexistente/de outro tenant', async () => {
    mocks.findFirst.mockResolvedValueOnce({ id: CHAMADO, tenantId: TENANT } as never)
    mocks.usuario.mockResolvedValue(null as never)
    const r = await commands.atribuir(CHAMADO, { tenantId: TENANT }, 'admin-1', {
      responsavelId: 'intruso',
    })
    expect(r).toBeNull()
    expect(mocks.update).not.toHaveBeenCalled()
  })
})

describe('cancelar / editarFiscal', () => {
  it('cancelar só age em chamados vivos', async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 } as never)
    mocks.findFirst.mockResolvedValue({ id: CHAMADO } as never)

    await commands.cancelar(CHAMADO, { tenantId: TENANT }, 'admin-1')

    const call = mocks.updateMany.mock.calls[0][0]
    expect(call.where).toMatchObject({ status: { in: ['aberto', 'em_execucao'] } })
    expect(call.data).toMatchObject({ status: 'cancelado', atualizadoPorId: 'admin-1' })
  })

  it('editarFiscal atualiza apenas os campos enviados', async () => {
    mocks.findFirst.mockResolvedValue({ id: CHAMADO } as never)
    mocks.update.mockResolvedValue({ id: CHAMADO } as never)

    await commands.editarFiscal(CHAMADO, { tenantId: TENANT }, 'admin-1', {
      fornecedor: 'MEGA',
    })

    const data = mocks.update.mock.calls[0][0].data as Record<string, unknown>
    expect(data.fornecedor).toBe('MEGA')
    expect(data).not.toHaveProperty('numeroOrdemCompra')
    expect(data).not.toHaveProperty('valorGastoCentavos')
  })
})
