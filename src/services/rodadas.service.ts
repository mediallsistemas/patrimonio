import { api } from '@/services/api'
import type { RodadaInspecao } from '@/services/inspecao.types'

export async function listar(): Promise<RodadaInspecao[]> {
  const json = await api.get<{ data: RodadaInspecao[] } | RodadaInspecao[]>('rodadas')
  if (Array.isArray(json)) return json
  return (json as { data?: RodadaInspecao[] }).data ?? []
}

export async function criar(): Promise<{ id: string }> {
  const json = await api.post<{ data: { id: string } }>('rodadas', {})
  return json.data
}

export async function finalizar(id: string): Promise<void> {
  await api.patch(`rodadas/${id}`, {})
}

export async function registrarAmbiente(id: string, body: unknown): Promise<void> {
  await api.post(`rodadas/${id}/ambientes`, body)
}
