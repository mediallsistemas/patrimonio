import { describe, it, expect } from 'vitest'

import {
  FILTRO_AGENDAMENTOS_VAZIO,
  agendamentoPassaFiltro,
  filtroAgendamentosAtivo,
  situacaoAgendamento,
} from './agendamentos.rules'

const HOJE = '2026-09-14'

const pendente = (dia: string) => ({ status: 'pendente', dataAgendada: `${dia}T12:00:00.000Z` })

describe('agendamentos.rules — situação', () => {
  it('pendente antes de hoje é atrasado; hoje ou depois é agendado', () => {
    expect(situacaoAgendamento(pendente('2026-09-13'), HOJE)).toBe('atrasado')
    expect(situacaoAgendamento(pendente('2026-09-14'), HOJE)).toBe('agendado')
    expect(situacaoAgendamento(pendente('2026-10-01'), HOJE)).toBe('agendado')
  })

  it('realizado e cancelado não dependem da data', () => {
    expect(situacaoAgendamento({ status: 'realizado', dataAgendada: '2026-01-01T12:00:00.000Z' }, HOJE)).toBe('realizado')
    expect(situacaoAgendamento({ status: 'cancelado', dataAgendada: '2026-01-01T12:00:00.000Z' }, HOJE)).toBe('cancelado')
  })
})

describe('agendamentos.rules — filtro', () => {
  it('filtro vazio não está ativo e deixa tudo passar', () => {
    expect(filtroAgendamentosAtivo(FILTRO_AGENDAMENTOS_VAZIO)).toBe(false)
    expect(agendamentoPassaFiltro(pendente('2020-01-01'), FILTRO_AGENDAMENTOS_VAZIO, HOJE)).toBe(true)
  })

  it('qualquer campo preenchido ativa o filtro', () => {
    expect(filtroAgendamentosAtivo({ ...FILTRO_AGENDAMENTOS_VAZIO, situacao: 'atrasado' })).toBe(true)
    expect(filtroAgendamentosAtivo({ ...FILTRO_AGENDAMENTOS_VAZIO, de: '2026-09-01' })).toBe(true)
    expect(filtroAgendamentosAtivo({ ...FILTRO_AGENDAMENTOS_VAZIO, ate: '2026-09-30' })).toBe(true)
  })

  it('período é inclusivo nas duas pontas', () => {
    const f = { situacao: '' as const, de: '2026-09-01', ate: '2026-09-30' }
    expect(agendamentoPassaFiltro(pendente('2026-09-01'), f, HOJE)).toBe(true)
    expect(agendamentoPassaFiltro(pendente('2026-09-30'), f, HOJE)).toBe(true)
    expect(agendamentoPassaFiltro(pendente('2026-08-31'), f, HOJE)).toBe(false)
    expect(agendamentoPassaFiltro(pendente('2026-10-01'), f, HOJE)).toBe(false)
  })

  it('situação e período combinam (E)', () => {
    const f = { situacao: 'atrasado' as const, de: '2026-09-01', ate: '' }
    expect(agendamentoPassaFiltro(pendente('2026-09-10'), f, HOJE)).toBe(true)
    expect(agendamentoPassaFiltro(pendente('2026-08-10'), f, HOJE)).toBe(false) // atrasado, fora do período
    expect(agendamentoPassaFiltro(pendente('2026-09-20'), f, HOJE)).toBe(false) // no período, não atrasado
    expect(agendamentoPassaFiltro({ status: 'realizado', dataAgendada: '2026-09-10T12:00:00.000Z' }, f, HOJE)).toBe(false)
  })
})
