import { api } from '@/services/api'
import type { Agendamento } from '@/app/admin/bens/bens.types'

export async function listar(): Promise<Agendamento[]> {
  const json = await api.get<{ data: Agendamento[] }>('agendamentos')
  return json.data ?? []
}
