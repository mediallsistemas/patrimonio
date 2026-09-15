// Regras puras de agendamentos — sem I/O, sem Prisma, sem req/res.
// Consumidas pela tela de bens (filtros) e pelo relatório PDF, para que a
// situação exibida, o filtro e o export nunca divirjam.

export type SituacaoAgendamento = 'agendado' | 'atrasado' | 'realizado' | 'cancelado'

export const SITUACAO_AGENDAMENTO_LABEL: Record<SituacaoAgendamento, string> = {
  agendado: 'Agendado',
  atrasado: 'Atrasado',
  realizado: 'Realizado',
  cancelado: 'Cancelado',
}

interface AgendamentoSituacao {
  status: string
  dataAgendada: string
}

/** Hoje em yyyy-MM-dd (UTC) — mesma base de comparação usada no BemRow/ModalAgendamento. */
export function hojeIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Pendente com data anterior a hoje = atrasado. */
export function situacaoAgendamento(ag: AgendamentoSituacao, hojeStr: string): SituacaoAgendamento {
  if (ag.status === 'realizado') return 'realizado'
  if (ag.status === 'cancelado') return 'cancelado'
  return ag.dataAgendada.slice(0, 10) < hojeStr ? 'atrasado' : 'agendado'
}

export interface FiltroAgendamentos {
  situacao: '' | Exclude<SituacaoAgendamento, 'cancelado'>
  /** yyyy-MM-dd inclusivo, sobre a data agendada ('' = sem limite) */
  de: string
  ate: string
}

export const FILTRO_AGENDAMENTOS_VAZIO: FiltroAgendamentos = { situacao: '', de: '', ate: '' }

export function filtroAgendamentosAtivo(f: FiltroAgendamentos): boolean {
  return f.situacao !== '' || f.de !== '' || f.ate !== ''
}

export function agendamentoPassaFiltro(
  ag: AgendamentoSituacao,
  f: FiltroAgendamentos,
  hojeStr: string,
): boolean {
  const dia = ag.dataAgendada.slice(0, 10)
  if (f.de && dia < f.de) return false
  if (f.ate && dia > f.ate) return false
  if (f.situacao && situacaoAgendamento(ag, hojeStr) !== f.situacao) return false
  return true
}
