'use client'

import { api } from './api'

export interface RondaOcorrencia {
  id: string
  iniciadoEm: string
  finalizadoEm: string | null
  tenantId: string
  criadoPorId: string
  ambientes: RegistroAmbiente[]
}

export interface RegistroAmbiente {
  id: string
  rondaId: string
  ambiente: string
  temOcorrencia: boolean
  concluidoEm: string
  ocorrencia: OcorrenciaDetalhe | null
}

export interface OcorrenciaDetalhe {
  id: string
  tipo: string
  descricao: string
  trilogoChamado: boolean
}

interface ApiResponse<T> {
  data: T
}

export const rondasService = {
  listar: () => api.get<ApiResponse<RondaOcorrencia[]>>('rondas'),

  criar: () => api.post<ApiResponse<RondaOcorrencia>>('rondas', {}),

  finalizar: (id: string) =>
    api.patch<ApiResponse<RondaOcorrencia>>(`rondas/${id}`, {}),

  getDraft: () => api.get<ApiResponse<unknown>>('rondas/draft'),

  saveDraft: (estado: unknown) =>
    api.patch<ApiResponse<unknown>>('rondas/draft', estado),

  deleteDraft: () => api.delete<void>('rondas/draft'),
}
