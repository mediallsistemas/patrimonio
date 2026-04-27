import { api } from '@/services/api'

export interface RecenteMovimentacao {
  id: string
  pessoa_id: string
  tipo: 'retirada' | 'devolucao'
  data_hora: string
  pessoa_nome: string
  pessoa_cpf: string
}

export interface TenantDashboardStats {
  tenant: { id: string; nome: string; slug: string }
  totalPessoas: number
  retiradasHoje: number
  devolucoesHoje: number
  totalPendentes: number
  movimentacoesPorDia: { data: string; retiradas: number; devolucoes: number }[]
  recentes: RecenteMovimentacao[]
}

export async function buscarMetricas(tenantId: string): Promise<TenantDashboardStats> {
  const json = await api.get<{ data: TenantDashboardStats } | TenantDashboardStats>(
    `admin/dashboard?tenantId=${tenantId}`
  )
  return ('data' in json ? json.data : json) as TenantDashboardStats
}
