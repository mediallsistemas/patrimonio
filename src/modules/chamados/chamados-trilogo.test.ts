import { describe, it, expect } from 'vitest'

import {
  converterTicket,
  mapearPrioridade,
  mapearTipo,
  mapearTitulo,
  mapearStatus,
  ehTerminal,
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
  currentStatus: { actionDescription: 'Aberto' },
  buildingServiceTypeDescription: 'Elétrica predial',
}

describe('mapearStatus', () => {
  // Os cinco valores que a API de produção devolve de fato, com a contagem
  // observada em 868 tickets de 120 dias. Este teste é o registro disso —
  // se a API passar a devolver outro texto, o mapa precisa saber.
  it('cobre os cinco status reais da API', () => {
    expect(mapearStatus('Executado')).toBe('finalizado')   // 697 ocorrências
    expect(mapearStatus('Em Execução')).toBe('em_execucao') // 101
    expect(mapearStatus('Aberto')).toBe('aberto')           //  66
    expect(mapearStatus('Arquivado')).toBe('cancelado')     //   3
    expect(mapearStatus('Cancelado')).toBe('cancelado')     //   1
  })

  // O mapa anterior era suposição: usava 'Concluído', que a API não devolve.
  // 'Executado' não casava com nada e caía no padrão 'aberto' — 697 tickets já
  // resolvidos virariam chamados abertos.
  it('Executado não pode cair no padrão aberto', () => {
    expect(mapearStatus('Executado')).not.toBe('aberto')
  })

  it('ignora acento, caixa e espaço', () => {
    expect(mapearStatus('  EXECUTADO ')).toBe('finalizado')
    expect(mapearStatus('em execucao')).toBe('em_execucao')
    expect(mapearStatus('CONCLUÍDO')).toBe('finalizado')
  })

  // Sumir como finalizado esconderia trabalho de verdade; aparecer na fila, não.
  it('status desconhecido ou vazio cai em aberto', () => {
    expect(mapearStatus('Aguardando peça')).toBe('aberto')
    expect(mapearStatus(null)).toBe('aberto')
    expect(mapearStatus('')).toBe('aberto')
  })
})

describe('ehTerminal', () => {
  it('separa o que ainda pede trabalho do que não pede', () => {
    expect(ehTerminal('aberto')).toBe(false)
    expect(ehTerminal('em_execucao')).toBe(false)
    expect(ehTerminal('finalizado')).toBe(true)
    expect(ehTerminal('cancelado')).toBe(true)
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

  // Todo ticket entra, concluído inclusive — a fila os mostra por último.
  it('importa ticket executado guardando o texto cru do status', () => {
    const r = converterTicket({
      ...TICKET_BASE,
      currentStatus: { actionDescription: 'Executado' },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.chamado.status).toBe('finalizado')
    expect(r.chamado.trilogoStatusOrigem).toBe('Executado')
  })

  it('guarda o texto cru mesmo quando o status não é reconhecido', () => {
    const r = converterTicket({
      ...TICKET_BASE,
      currentStatus: { actionDescription: 'Aguardando peça' },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.chamado.status).toBe('aberto')
    expect(r.chamado.trilogoStatusOrigem).toBe('Aguardando peça')
  })

  it('ticket sem status na origem entra como aberto, com origem nula', () => {
    const r = converterTicket({ ...TICKET_BASE, currentStatus: null })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.chamado.status).toBe('aberto')
    expect(r.chamado.trilogoStatusOrigem).toBeNull()
  })

  // O responsável do Trílogo não é usuário daqui, e `assumir` exige 'aberto' —
  // um chamado em execução sem responsável ninguém consegue pegar.
  it('em execução na origem vira aberto aqui', () => {
    const r = converterTicket({
      ...TICKET_BASE,
      currentStatus: { actionDescription: 'Em Execução' },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.chamado.status).toBe('aberto')
    expect(r.chamado.trilogoStatusOrigem).toBe('Em Execução')
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
  const v = (
    tenantId: string,
    trilogoCompanyId: number,
    trilogoProjectName: string | null,
    slug = tenantId,
    nome = tenantId,
  ) => ({ tenantId, trilogoCompanyId, trilogoProjectName, slug, nome })

  const VINCULOS = [
    v('t-hrpg', 168, 'HRPG', 'hrpg', 'Hospital Regional de Pedra Grande'),
    v('t-uei', 168, 'UEI', 'uei', 'Unidade Estadual Integrada'),
    v('t-solo', 200, null, 'solo', 'Hospital Solo'),
  ]

  it('resolve pelo projeto contido no endereço', () => {
    expect(resolverTenant(TICKET_BASE, VINCULOS)).toEqual({
      tenantId: 't-hrpg',
      origem: 'projeto',
    })
  })

  it('empresa sem tenant correspondente não resolve', () => {
    expect(resolverTenant({ ...TICKET_BASE, companyId: 999 }, VINCULOS)).toBeNull()
  })

  it('ticket sem companyId não resolve', () => {
    expect(resolverTenant({ ...TICKET_BASE, companyId: null }, VINCULOS)).toBeNull()
  })

  // ── Degrau do meio: o endereço do Trílogo traz o nome do hospital ──────────

  it('sem projeto configurado, o slug do tenant no endereço resolve', () => {
    const vinculos = [v('t-a', 168, null, 'hrpg', 'Hospital Regional de Pedra Grande')]
    expect(resolverTenant(TICKET_BASE, vinculos)).toEqual({ tenantId: 't-a', origem: 'nome' })
  })

  it('o nome completo do tenant também resolve, ignorando acento', () => {
    const vinculos = [v('t-a', 168, null, 'unidade-leste', 'Unidade Integrada Leste')]
    const t = { ...TICKET_BASE, departmentFullAddress: 'UNIDADE INTEGRADA LESTE - ALA 2' }
    expect(resolverTenant(t, vinculos)).toEqual({ tenantId: 't-a', origem: 'nome' })
  })

  // Nos dois casos abaixo há um segundo tenant na empresa de propósito: sem ele,
  // o último degrau (empresa com um tenant só) assumiria e esconderia o que se
  // quer verificar — que o casamento por nome NÃO ocorreu.

  // Palavra inteira, não trecho: "PG" dentro de "HRPG" casaria o hospital errado.
  it('sigla que é só um pedaço de outra palavra não casa', () => {
    const vinculos = [v('t-pg', 168, null, 'pg', 'PG'), v('t-outro', 168, null, 'zzz', 'ZZZ')]
    expect(resolverTenant(TICKET_BASE, vinculos)).toBeNull()
  })

  // Todas as palavras, não qualquer uma: senão "Hospital Regional" casaria com
  // qualquer hospital regional da mesma empresa.
  it('nome parcialmente presente não casa', () => {
    const vinculos = [
      v('t-a', 168, null, 'hospital-regional-sul', 'Hospital Regional Sul'),
      v('t-outro', 168, null, 'zzz', 'ZZZ'),
    ]
    const t = { ...TICKET_BASE, departmentFullAddress: 'HOSPITAL REGIONAL NORTE - ALA 1' }
    expect(resolverTenant(t, vinculos)).toBeNull()
  })

  it('dois tenants casando por nome vão para triagem', () => {
    const vinculos = [
      v('t-a', 168, null, 'hrpg', 'HRPG'),
      v('t-b', 168, null, 'hrpg-anexo', 'HRPG'),
    ]
    expect(resolverTenant(TICKET_BASE, vinculos)).toBeNull()
  })

  it('projeto configurado vence o casamento por nome', () => {
    const vinculos = [
      v('t-projeto', 168, 'HRPG', 'outro', 'Outro Nome'),
      v('t-nome', 168, null, 'hrpg', 'HRPG'),
    ]
    expect(resolverTenant(TICKET_BASE, vinculos)).toEqual({
      tenantId: 't-projeto',
      origem: 'projeto',
    })
  })

  // ── Último degrau: só a empresa ───────────────────────────────────────────

  // Nada além do companyId confirma a unidade. Continua sendo importado, mas a
  // origem sai no resultado da sincronização para conferência — se a empresa
  // tiver um hospital não cadastrado, é aqui que ele erra.
  it('resolve por companyId quando nada mais identifica, marcando a origem', () => {
    const t = { ...TICKET_BASE, companyId: 200, departmentFullAddress: 'QUALQUER LUGAR' }
    expect(resolverTenant(t, VINCULOS)).toEqual({ tenantId: 't-solo', origem: 'empresa' })
  })

  it('endereço que não cita projeto nem nome, com empresa dividida, não resolve', () => {
    const t = { ...TICKET_BASE, departmentFullAddress: 'ENDERECO ANONIMO 123' }
    expect(resolverTenant(t, VINCULOS)).toBeNull()
  })

  // Ambiguidade e chute são coisas diferentes: dois candidatos vão para triagem.
  it('dois tenants sem nada que os distinga não resolvem', () => {
    const ambiguo = [
      v('t-a', 168, null, 'aaa', 'AAA'),
      v('t-b', 168, null, 'bbb', 'BBB'),
    ]
    const t = { ...TICKET_BASE, departmentFullAddress: 'ENDERECO ANONIMO 123' }
    expect(resolverTenant(t, ambiguo)).toBeNull()
  })

  // Antes o tenant sem projeto abocanhava tudo que não casasse por projeto.
  it('sem casar projeto nem nome, tenant sem projeto na empresa dividida vai para triagem', () => {
    const misto = [
      v('t-com', 168, 'HRPG', 'com', 'Com Projeto'),
      v('t-sem', 168, null, 'sem', 'Sem Projeto'),
    ]
    const t = { ...TICKET_BASE, departmentFullAddress: 'OUTRO ENDERECO QUALQUER' }
    expect(resolverTenant(t, misto)).toBeNull()
  })
})
