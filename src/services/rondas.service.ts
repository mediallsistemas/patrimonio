import { api } from '@/services/api'
import type { OcorrenciaDetalhe, RegistroAmbiente, Ronda } from '@/services/rondas.types'

export type { OcorrenciaDetalhe, RegistroAmbiente, Ronda }

export interface BlocoAPI {
  id: string
  nome: string
  ordem: number
  ambientes: AmbienteAPI[]
}

export interface AmbienteAPI {
  id: string
  nome: string
  tipo: 'ocorrencia' | 'gases'
  ordem: number
}

export interface AmbienteTenant {
  id: string
  nome: string
  tipo: 'ocorrencia' | 'gases'
  ordem: number
}

export interface DraftPayload {
  estado: unknown
}

export interface RegistrarAmbienteBody {
  tipoRegistro: 'ocorrencia' | 'gases'
  ambiente: string
  temOcorrencia: boolean
  ocorrencias?: unknown[]
  // gases-specific
  purezaO2?: number
  pressaoO2?: number
  pressaoAr?: number
  backupLigado?: boolean
  temAbastecimento?: boolean
  qtdCilindros?: number | null
  tamCilindro?: string | null
}

export async function listar(): Promise<Ronda[]> {
  const json = await api.get<{ data: Ronda[] } | Ronda[]>('rondas')
  if (Array.isArray(json)) return json
  return (json as { data?: Ronda[] }).data ?? []
}

export async function criar(): Promise<{ id: string }> {
  const json = await api.post<{ data: { id: string } }>('rondas', {})
  return json.data
}

export async function finalizar(rondaId: string): Promise<void> {
  await api.patch(`rondas/${rondaId}`, {})
}

export async function registrarAmbiente(rondaId: string, body: RegistrarAmbienteBody): Promise<void> {
  await api.post(`rondas/${rondaId}/ambientes`, body)
}

export async function buscarDraft(): Promise<{ estado: unknown } | null> {
  const json = await api.get<{ data: { estado: unknown } | null }>('rondas/draft')
  return json.data ?? null
}

export async function salvarDraftAPI(estado: unknown): Promise<void> {
  await fetch('/api/rondas/draft', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(estado),
    credentials: 'include',
  })
}

export async function descartarDraftAPI(): Promise<void> {
  await api.delete('rondas/draft')
}

export async function buscarBlocos(): Promise<BlocoAPI[]> {
  const json = await api.get<{ data: BlocoAPI[] }>('me/blocos')
  return json.data ?? []
}

export async function buscarAmbientesTenant(tenantSlug: string): Promise<AmbienteTenant[]> {
  const json = await api.get<{ data: AmbienteTenant[] }>(`tenants/${tenantSlug}/ambientes`)
  return json.data ?? []
}

export async function buscarFotoOcorrencia(ocorrenciaId: string): Promise<{ foto: string | null }> {
  const json = await api.get<{ data: { foto: string | null } }>(`ocorrencias/${ocorrenciaId}/foto`)
  return json.data ?? { foto: null }
}
