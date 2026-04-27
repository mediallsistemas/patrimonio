import { api } from '@/services/api'
import type { RodadaInspecao } from '@/services/inspecao.types'

export async function listar(): Promise<RodadaInspecao[]> {
  const json = await api.get<{ data: RodadaInspecao[] } | RodadaInspecao[]>('rodadas')
  if (Array.isArray(json)) return json
  return (json as { data?: RodadaInspecao[] }).data ?? []
}
