'use client'

import { api } from './api'

export interface Agendamento {
  id: string
  trilogoAssetId: number
  patrimony: string
  descricaoBem: string
  companyId: number
  companyName: string
  ambiente: string
  dataAgendada: string
  titulo: string
  observacao: string | null
  status: string
  criadoEm: string
  criadoPorId: string
}

export interface CreateAgendamentoPayload {
  trilogoAssetId: number
  patrimony: string
  descricaoBem: string
  companyId: number
  companyName: string
  ambiente: string
  dataAgendada: string
  titulo: string
  observacao?: string
}

interface ApiResponse<T> {
  data: T
}

export const agendamentosService = {
  listar: () => api.get<ApiResponse<Agendamento[]>>('agendamentos'),

  criar: (payload: CreateAgendamentoPayload) =>
    api.post<ApiResponse<Agendamento>>('agendamentos', payload),

  concluir: (id: string) =>
    api.patch<ApiResponse<Agendamento>>(`agendamentos/${id}`, { status: 'realizado' }),

  cancelar: (id: string) =>
    api.patch<ApiResponse<Agendamento>>(`agendamentos/${id}`, { status: 'cancelado' }),
}
