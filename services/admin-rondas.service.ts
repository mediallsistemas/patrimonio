import { api } from '@/services/api'
import type { OcorrenciaDetalhe, RegistroAmbiente, RondaTenant, Ronda } from '@/services/rondas.types'

export type { OcorrenciaDetalhe, RegistroAmbiente, RondaTenant, Ronda }

export async function listarRondas(): Promise<Ronda[]> {
  const json = await api.get<{ data: Ronda[] } | Ronda[]>('admin/rondas')
  if (Array.isArray(json)) return json
  return (json as { data?: Ronda[] }).data ?? []
}
