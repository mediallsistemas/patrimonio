import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Prisma e fetch mockados. O que interessa aqui é o comportamento da
// sincronização: quantas idas ao banco, o que é gravado, o que sobra na
// triagem — nada disso precisa de banco de verdade.
// vi.hoisted porque vi.mock sobe para o topo do arquivo e não enxerga const comum.
const { chamado, tenant, usuario, triagem } = vi.hoisted(() => ({
  chamado: { findMany: vi.fn(), createMany: vi.fn(), create: vi.fn() },
  tenant: { findMany: vi.fn() },
  usuario: { upsert: vi.fn() },
  triagem: { upsert: vi.fn(), updateMany: vi.fn() },
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    chamado,
    tenant,
    usuario,
    ticketTrilogoTriagem: triagem,
  },
}))

import { sincronizarChamadosTrilogo, janelaPadrao } from './chamados-sync.service'
import type { TicketTrilogo } from './chamados-trilogo'

const TICKET: TicketTrilogo = {
  id: 1,
  description: 'Porta do almoxarifado empenada',
  creationDate: '2026-07-20T10:00:00.000Z',
  deadline: '2026-07-27T10:00:00.000Z',
  assetId: 987,
  assetName: 'Porta corta-fogo',
  patrimony: 'PAT-1',
  companyId: 168,
  departmentName: 'Almoxarifado',
  departmentFullAddress: 'HRPG - TERREO - ALMOXARIFADO',
  priority: 2,
  currentStatus: { actionDescription: 'Aberto' },
  buildingServiceTypeDescription: 'Marcenaria',
}

function ticket(over: Partial<TicketTrilogo> & { id: number }): TicketTrilogo {
  return { ...TICKET, ...over }
}

function responderTrilogo(tickets: TicketTrilogo[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => tickets })) as unknown as typeof fetch,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  tenant.findMany.mockResolvedValue([
    {
      id: 't-hrpg',
      slug: 'hrpg',
      nome: 'Hospital Regional de Pedra Grande',
      trilogoCompanyId: 168,
      trilogoProjectName: 'HRPG',
    },
  ])
  usuario.upsert.mockResolvedValue({ id: 'u-sistema' })
  chamado.findMany.mockResolvedValue([])
  chamado.createMany.mockImplementation(async ({ data }: { data: unknown[] }) => ({
    count: data.length,
  }))
  triagem.upsert.mockResolvedValue({})
  triagem.updateMany.mockResolvedValue({ count: 0 })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('importação', () => {
  it('importa ticket aberto e o grava na unidade resolvida', async () => {
    responderTrilogo([TICKET])
    const r = await sincronizarChamadosTrilogo('2026-07-20', '2026-07-27')

    expect(r.criados).toBe(1)
    const linhas = chamado.createMany.mock.calls[0][0].data
    expect(linhas[0]).toMatchObject({
      trilogoTicketId: 1,
      tenantId: 't-hrpg',
      status: 'aberto',
      criadoPorId: 'u-sistema',
    })
  })

  // A consulta de existência era uma por ticket. Numa janela de 366 dias isso
  // eram milhares de idas ao banco em série.
  it('checa existência em uma consulta só, não uma por ticket', async () => {
    responderTrilogo([ticket({ id: 1 }), ticket({ id: 2 }), ticket({ id: 3 })])
    await sincronizarChamadosTrilogo('2026-07-20', '2026-07-27')

    expect(chamado.findMany).toHaveBeenCalledTimes(1)
    expect(chamado.findMany.mock.calls[0][0].where).toEqual({
      trilogoTicketId: { in: [1, 2, 3] },
    })
  })

  it('não regrava o que já existe', async () => {
    responderTrilogo([ticket({ id: 1 }), ticket({ id: 2 })])
    chamado.findMany.mockResolvedValue([{ trilogoTicketId: 1 }])

    const r = await sincronizarChamadosTrilogo('2026-07-20', '2026-07-27')
    expect(r.jaExistiam).toBe(1)
    expect(r.criados).toBe(1)
    expect(chamado.createMany.mock.calls[0][0].data).toHaveLength(1)
  })

  it('grava em lote com skipDuplicates — corrida entre execuções não derruba o lote', async () => {
    responderTrilogo([ticket({ id: 1 }), ticket({ id: 2 })])
    await sincronizarChamadosTrilogo('2026-07-20', '2026-07-27')
    expect(chamado.createMany.mock.calls[0][0].skipDuplicates).toBe(true)
  })

  it('lote que falha é reprocessado um a um, sem perder os bons', async () => {
    responderTrilogo([ticket({ id: 1 }), ticket({ id: 2 })])
    chamado.createMany.mockRejectedValue(new Error('erro no lote'))
    chamado.create
      .mockResolvedValueOnce({ id: 'c1' })
      .mockRejectedValueOnce(new Error('coluna invalida'))

    const r = await sincronizarChamadosTrilogo('2026-07-20', '2026-07-27')
    expect(r.criados).toBe(1)
    expect(r.triagem.map((t) => t.trilogoTicketId)).toEqual([2])
    expect(r.triagem[0].motivo).toContain('falha ao gravar')
  })

  it('simular não escreve nada', async () => {
    responderTrilogo([TICKET])
    const r = await sincronizarChamadosTrilogo('2026-07-20', '2026-07-27', true)

    expect(r.criados).toBe(1)
    expect(chamado.createMany).not.toHaveBeenCalled()
    expect(chamado.create).not.toHaveBeenCalled()
    expect(triagem.upsert).not.toHaveBeenCalled()
    expect(usuario.upsert).not.toHaveBeenCalled()
  })
})

describe('triagem', () => {
  // Mudança de comportamento: status desconhecido era recusado, agora entra.
  it('status desconhecido não vai para a fila — entra guardando o texto cru', async () => {
    responderTrilogo([ticket({ id: 9, currentStatus: { actionDescription: 'Aguardando peça' } })])
    const r = await sincronizarChamadosTrilogo('2026-07-20', '2026-07-27')

    expect(r.criados).toBe(1)
    expect(r.emTriagem).toBe(0)
    expect(triagem.upsert).not.toHaveBeenCalled()
    expect(chamado.createMany.mock.calls[0][0].data[0]).toMatchObject({
      status: 'aberto',
      trilogoStatusOrigem: 'Aguardando peça',
    })
  })

  it('ticket concluído na origem entra como finalizado', async () => {
    responderTrilogo([ticket({ id: 9, currentStatus: { actionDescription: 'Concluído' } })])
    const r = await sincronizarChamadosTrilogo('2026-07-20', '2026-07-27')

    expect(r.criados).toBe(1)
    expect(chamado.createMany.mock.calls[0][0].data[0]).toMatchObject({
      status: 'finalizado',
      trilogoStatusOrigem: 'Concluído',
    })
  })

  it('ticket sem prazo válido é persistido na fila com o motivo', async () => {
    responderTrilogo([ticket({ id: 9, deadline: null })])
    const r = await sincronizarChamadosTrilogo('2026-07-20', '2026-07-27')

    expect(r.criados).toBe(0)
    expect(r.emTriagem).toBe(1)
    const gravado = triagem.upsert.mock.calls[0][0]
    expect(gravado.where).toEqual({ trilogoTicketId: 9 })
    expect(gravado.create.motivo).toContain('prazo')
    // O status cru vai para a fila mesmo quando a recusa foi por outro motivo.
    expect(gravado.create.statusOrigem).toBe('Aberto')
  })

  it('ticket sem unidade resolvida entra na fila', async () => {
    responderTrilogo([ticket({ id: 7, companyId: 999 })])
    const r = await sincronizarChamadosTrilogo('2026-07-20', '2026-07-27')

    expect(r.emTriagem).toBe(1)
    expect(triagem.upsert.mock.calls[0][0].create.motivo)
      .toBe('não foi possível determinar a unidade')
  })

  // Reaparecer é sinal de regra a ajustar: o contador mostra isso.
  it('recusa repetida incrementa o contador em vez de duplicar', async () => {
    responderTrilogo([ticket({ id: 9, description: '   ' })])
    await sincronizarChamadosTrilogo('2026-07-20', '2026-07-27')

    expect(triagem.upsert.mock.calls[0][0].update.ocorrencias).toEqual({ increment: 1 })
    expect(triagem.upsert.mock.calls[0][0].update.resolvidoEm).toBeNull()
  })

  it('ticket que finalmente importa é fechado na fila', async () => {
    responderTrilogo([TICKET])
    await sincronizarChamadosTrilogo('2026-07-20', '2026-07-27')

    expect(triagem.updateMany).toHaveBeenCalledTimes(1)
    expect(triagem.updateMany.mock.calls[0][0].where).toMatchObject({
      trilogoTicketId: { in: [1] },
      resolvidoEm: null,
    })
  })
})

describe('origem do vínculo', () => {
  it('conta quantos foram vinculados só pela empresa', async () => {
    tenant.findMany.mockResolvedValue([
      { id: 't-solo', slug: 'solo', nome: 'Hospital Solo', trilogoCompanyId: 200, trilogoProjectName: null },
    ])
    responderTrilogo([ticket({ id: 5, companyId: 200, departmentFullAddress: 'ENDERECO ANONIMO' })])

    const r = await sincronizarChamadosTrilogo('2026-07-20', '2026-07-27')
    expect(r.criados).toBe(1)
    expect(r.vinculadosSoPorEmpresa).toBe(1)
  })

  it('vínculo confirmado pelo projeto não entra na contagem de conferência', async () => {
    responderTrilogo([TICKET])
    const r = await sincronizarChamadosTrilogo('2026-07-20', '2026-07-27')
    expect(r.vinculadosSoPorEmpresa).toBe(0)
  })

  // O nome do hospital no endereço é evidência real — não precisa de conferência.
  it('vínculo pelo nome do tenant também não entra na contagem', async () => {
    tenant.findMany.mockResolvedValue([
      { id: 't-a', slug: 'hrpg', nome: 'Hospital Regional', trilogoCompanyId: 168, trilogoProjectName: null },
      { id: 't-b', slug: 'uei', nome: 'Unidade Estadual', trilogoCompanyId: 168, trilogoProjectName: null },
    ])
    responderTrilogo([TICKET])

    const r = await sincronizarChamadosTrilogo('2026-07-20', '2026-07-27')
    expect(r.criados).toBe(1)
    expect(r.vinculadosSoPorEmpresa).toBe(0)
    expect(chamado.createMany.mock.calls[0][0].data[0].tenantId).toBe('t-a')
  })
})

describe('janelaPadrao', () => {
  it('volta os dias pedidos a partir da data dada', () => {
    const { inicio, fim } = janelaPadrao(7, new Date('2026-07-28T12:00:00.000Z'))
    expect(fim).toBe('2026-07-28')
    expect(inicio).toBe('2026-07-21')
  })
})
