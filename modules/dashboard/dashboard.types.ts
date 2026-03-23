export interface DashboardRecenteItem {
  id: string
  pessoa_id: string
  tipo: string
  data_hora: Date
  pessoa_nome: string
  pessoa_cpf: string
}

export interface DashboardMovimentacaoDia {
  data: string
  retiradas: number
  devolucoes: number
}

export interface DashboardData {
  totalPessoas: number
  retiradasHoje: number
  devolucoesHoje: number
  totalPendentes: number
  movimentacoesPorDia: DashboardMovimentacaoDia[]
  recentes: DashboardRecenteItem[]
}
