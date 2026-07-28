import { api } from '@/services/api'

export interface TicketEmTriagem {
  trilogoTicketId: number
  motivo: string
  statusOrigem: string | null
  descricao: string | null
  endereco: string | null
  companyId: number | null
  primeiraVezEm: string
  ultimaVezEm: string
  ocorrencias: number
  resolvidoEm: string | null
}

export interface FilaTriagem {
  total: number
  limite: number
  /** Contagem por motivo — mostra se o problema é uma regra ou casos isolados. */
  porMotivo: Record<string, number>
  itens: TicketEmTriagem[]
}

function unwrap<T>(res: { data: T }): T {
  return res.data
}

export async function listarTriagem(incluirResolvidos = false): Promise<FilaTriagem> {
  const qs = incluirResolvidos ? '?resolvidos=true' : ''
  return unwrap(await api.get<{ data: FilaTriagem }>(`admin/chamados/triagem${qs}`))
}
