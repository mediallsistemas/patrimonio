import { describe, it, expect } from 'vitest'

import {
  converterTicket,
  mapearPrioridade,
  mapearTipo,
  mapearTitulo,
  resolverTenant,
  statusEhAberto,
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
  currentStatus: { actionDescription: 'Aberto' },
  buildingServiceTypeDescription: 'Elétrica predial',
}

describe('statusEhAberto', () => {
  // 'Aberto' é o único valor de status do Trílogo confirmado no repositório —
  // as telas de patrimônio contam os abertos comparando com essa string.
  it('reconhece o único status confirmado', () => {
    expect(statusEhAberto('Aberto')).toBe(true)
  })

  it('ignora acento, caixa e espaço', () => {
    expect(statusEhAberto('  ABERTO ')).toBe(true)
    expect(statusEhAberto('abertó')).toBe(true)
  })

  it('qualquer outro status não é aberto', () => {
    expect(statusEhAberto('Em andamento')).toBe(false)
    expect(statusEhAberto('Concluído')).toBe(false)
    expect(statusEhAberto('Aguardando peça')).toBe(false)
    expect(statusEhAberto(null)).toBe(false)
    expect(statusEhAberto('')).toBe(false)
  })
})

describe('mapearPrioridade', () => {
  // Escala tirada do PRIORITY_LABEL das telas de patrimônio, não de suposição.
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
  it('converte um ticket aberto', () => {
    const r = converterTicket(TICKET_BASE)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.chamado).toMatchObject({
      trilogoTicketId: 1234,
      titulo: 'Ar-condicionado Split 12000',
      tipo: 'eletrica',
      prioridade: 'alta',
      status: 'aberto',
      trilogoAssetId: 987,
      patrimony: 'PAT-00123',
      ambienteNomeSnapshot: 'Enfermaria 2',
    })
    expect(r.chamado.prazo.toISOString()).toBe('2026-07-27T10:00:00.000Z')
    expect(r.chamado.criadoEm.toISOString()).toBe('2026-07-20T10:00:00.000Z')
  })

  // Importar um ticket já resolvido como chamado aberto criaria trabalho
  // fantasma numa fila que a equipe usa para se organizar.
  it('recusa status não reconhecido e devolve o texto literal', () => {
    const r = converterTicket({
      ...TICKET_BASE,
      currentStatus: { actionDescription: 'Em andamento' },
    })
    expect(r).toEqual({ ok: false, motivo: 'status "Em andamento" não reconhecido como aberto' })
  })

  it('recusa ticket sem status na origem', () => {
    expect(converterTicket({ ...TICKET_BASE, currentStatus: null }))
      .toEqual({ ok: false, motivo: 'ticket sem status na origem' })
  })

  // O status entra no chamado sempre como 'aberto': é o estado a partir do qual
  // o operador consegue assumir (`assumir` exige status 'aberto').
  it('o chamado nasce sempre em aberto', () => {
    const r = converterTicket(TICKET_BASE)
    if (!r.ok) throw new Error('deveria converter')
    expect(r.chamado.status).toBe('aberto')
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
    expect(resolverTenant(TICKET_BASE, VINCULOS)).toEqual({
      tenantId: 't-hrpg',
      origem: 'projeto',
    })
  })

  // Casamento fraco: nada além do companyId confirma a unidade. Continua sendo
  // importado, mas a origem sai no resultado da sincronização para conferência —
  // se a empresa tiver um hospital não cadastrado, é aqui que ele erra.
  it('resolve por companyId quando o tenant não tem projeto, marcando a origem', () => {
    const t = { ...TICKET_BASE, companyId: 200, departmentFullAddress: 'QUALQUER LUGAR' }
    expect(resolverTenant(t, VINCULOS)).toEqual({ tenantId: 't-solo', origem: 'empresa' })
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

  it('projeto que casa vence quem não tem projeto na mesma empresa', () => {
    const misto = [
      { tenantId: 't-com', trilogoCompanyId: 168, trilogoProjectName: 'HRPG' },
      { tenantId: 't-sem', trilogoCompanyId: 168, trilogoProjectName: null },
    ]
    expect(resolverTenant(TICKET_BASE, misto)).toEqual({ tenantId: 't-com', origem: 'projeto' })
  })

  // Antes o tenant sem projeto abocanhava tudo que não casasse por projeto.
  it('sem casar projeto, tenant sem projeto na empresa dividida vai para triagem', () => {
    const misto = [
      { tenantId: 't-com', trilogoCompanyId: 168, trilogoProjectName: 'HRPG' },
      { tenantId: 't-sem', trilogoCompanyId: 168, trilogoProjectName: null },
    ]
    const t = { ...TICKET_BASE, departmentFullAddress: 'OUTRO ENDERECO QUALQUER' }
    expect(resolverTenant(t, misto)).toBeNull()
  })

  it('ticket sem companyId não resolve', () => {
    expect(resolverTenant({ ...TICKET_BASE, companyId: null }, VINCULOS)).toBeNull()
  })
})
