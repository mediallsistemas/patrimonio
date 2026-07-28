import { describe, it, expect } from 'vitest'

import {
  converterTicket,
  mapearPrioridade,
  mapearStatus,
  mapearTipo,
  mapearTitulo,
  resolverTenant,
  type TicketTrilogo,
} from './chamados-trilogo'

const TICKET_BASE: TicketTrilogo = {
  id: 1234,
  description: 'Ar-condicionado da enfermaria não liga',
  creationDate: '2026-07-20T10:00:00.000Z',
  deadline: '2026-07-27T10:00:00.000Z',
  assetId: 987,
  assetName: 'Ar-condicionado Split 12000',
  patrimony: 'PAT-00123',
  companyId: 168,
  departmentName: 'Enfermaria 2',
  departmentFullAddress: 'HRPG - ALA NORTE - ENFERMARIA 2',
  priority: 3,
  currentStatus: { actionDescription: 'Em andamento' },
  buildingServiceTypeDescription: 'Elétrica predial',
}

describe('mapearStatus', () => {
  it('mapeia os quatro status do Trílogo', () => {
    expect(mapearStatus('Aberto')).toBe('aberto')
    expect(mapearStatus('Em andamento')).toBe('em_execucao')
    expect(mapearStatus('Concluído')).toBe('finalizado')
    expect(mapearStatus('Cancelado')).toBe('cancelado')
  })

  it('ignora acento e caixa', () => {
    expect(mapearStatus('CONCLUÍDO')).toBe('finalizado')
    expect(mapearStatus('concluido')).toBe('finalizado')
  })

  // Status novo do lado do Trílogo não pode sumir da fila — 'aberto' garante que alguém vê.
  it('status desconhecido ou vazio vira aberto', () => {
    expect(mapearStatus('Aguardando peça')).toBe('aberto')
    expect(mapearStatus(null)).toBe('aberto')
  })
})

describe('mapearPrioridade', () => {
  it('converte a escala numérica', () => {
    expect(mapearPrioridade(1)).toBe('baixa')
    expect(mapearPrioridade(2)).toBe('media')
    expect(mapearPrioridade(3)).toBe('alta')
    expect(mapearPrioridade(4)).toBe('urgente')
  })

  // Nunca inflar a fila: o que não se entende vira média, não urgente.
  it('ausente ou inválida vira media', () => {
    expect(mapearPrioridade(null)).toBe('media')
    expect(mapearPrioridade(undefined)).toBe('media')
    expect(mapearPrioridade(Number.NaN)).toBe('media')
  })
})

describe('mapearTipo', () => {
  it('detecta elétrica e hidráulica pela descrição do serviço', () => {
    expect(mapearTipo('Elétrica predial')).toBe('eletrica')
    expect(mapearTipo('MANUTENÇÃO HIDRÁULICA')).toBe('hidraulica')
    expect(mapearTipo('Encanamento')).toBe('hidraulica')
  })

  it('o resto cai em patrimonio', () => {
    expect(mapearTipo('Troca de equipamento')).toBe('patrimonio')
    expect(mapearTipo(null)).toBe('patrimonio')
  })
})

describe('mapearTitulo', () => {
  it('prefere o nome do bem', () => {
    expect(mapearTitulo(TICKET_BASE)).toBe('Ar-condicionado Split 12000')
  })

  it('sem bem, usa a descrição', () => {
    expect(mapearTitulo({ ...TICKET_BASE, assetName: null })).toBe(
      'Ar-condicionado da enfermaria não liga',
    )
  })

  it('trunca descrição longa sem estourar o limite da coluna', () => {
    const longa = 'x'.repeat(500)
    const titulo = mapearTitulo({ ...TICKET_BASE, assetName: null, description: longa })
    expect(titulo.length).toBeLessThanOrEqual(200)
  })

  it('sem bem e sem descrição, identifica pelo ticket', () => {
    expect(mapearTitulo({ ...TICKET_BASE, assetName: null, description: null })).toBe(
      'Ticket Trílogo #1234',
    )
  })
})

describe('converterTicket', () => {
  it('converte um ticket completo', () => {
    const r = converterTicket(TICKET_BASE)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.chamado).toMatchObject({
      trilogoTicketId: 1234,
      titulo: 'Ar-condicionado Split 12000',
      tipo: 'eletrica',
      prioridade: 'alta',
      status: 'em_execucao',
      trilogoAssetId: 987,
      patrimony: 'PAT-00123',
      ambienteNomeSnapshot: 'Enfermaria 2',
    })
    expect(r.chamado.prazo.toISOString()).toBe('2026-07-27T10:00:00.000Z')
    expect(r.chamado.criadoEm.toISOString()).toBe('2026-07-20T10:00:00.000Z')
  })

  // Recusar é melhor que inventar: estes vão para a fila de triagem com o motivo.
  it('recusa ticket sem descrição', () => {
    const r = converterTicket({ ...TICKET_BASE, description: '   ' })
    expect(r).toEqual({ ok: false, motivo: 'ticket sem descrição' })
  })

  it('recusa ticket sem prazo válido', () => {
    expect(converterTicket({ ...TICKET_BASE, deadline: null }).ok).toBe(false)
    expect(converterTicket({ ...TICKET_BASE, deadline: 'não é data' }).ok).toBe(false)
  })

  it('recusa ticket sem data de criação válida', () => {
    expect(converterTicket({ ...TICKET_BASE, creationDate: null }).ok).toBe(false)
  })

  it('preserva a descrição completa mesmo quando o título é truncado', () => {
    const longa = 'y'.repeat(500)
    const r = converterTicket({ ...TICKET_BASE, assetName: null, description: longa })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.chamado.descricao).toHaveLength(500)
  })
})

describe('resolverTenant', () => {
  const VINCULOS = [
    { tenantId: 't-hrpg', trilogoCompanyId: 168, trilogoProjectName: 'HRPG' },
    { tenantId: 't-uei', trilogoCompanyId: 168, trilogoProjectName: 'UEI' },
    { tenantId: 't-solo', trilogoCompanyId: 200, trilogoProjectName: null },
  ]

  it('resolve pelo projeto contido no endereço', () => {
    expect(resolverTenant(TICKET_BASE, VINCULOS)).toBe('t-hrpg')
  })

  it('resolve por companyId quando o tenant não tem projeto', () => {
    const t = { ...TICKET_BASE, companyId: 200, departmentFullAddress: 'QUALQUER LUGAR' }
    expect(resolverTenant(t, VINCULOS)).toBe('t-solo')
  })

  it('empresa sem tenant correspondente não resolve', () => {
    expect(resolverTenant({ ...TICKET_BASE, companyId: 999 }, VINCULOS)).toBeNull()
  })

  it('endereço que não cita projeto nenhum não resolve', () => {
    const t = { ...TICKET_BASE, departmentFullAddress: 'ENDERECO SEM PROJETO' }
    expect(resolverTenant(t, VINCULOS)).toBeNull()
  })

  // Ambiguidade e chute são coisas diferentes: dois candidatos vão para triagem.
  it('dois tenants candidatos não resolvem — vai para triagem', () => {
    const ambiguo = [
      { tenantId: 't-a', trilogoCompanyId: 168, trilogoProjectName: null },
      { tenantId: 't-b', trilogoCompanyId: 168, trilogoProjectName: null },
    ]
    expect(resolverTenant(TICKET_BASE, ambiguo)).toBeNull()
  })
})
