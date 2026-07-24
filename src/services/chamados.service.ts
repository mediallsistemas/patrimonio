import { api } from '@/services/api'

// Wrappers fetch do domínio de chamados — usados apenas pelos hooks.
// Tipos de domínio vêm de modules/chamados/chamados.types (client-safe) —
// nunca redigitar as unions aqui.
import type {
  TipoChamado,
  PrioridadeChamado,
  StatusChamado,
  DashboardChamados,
} from '@/modules/chamados/chamados.types'

export type { TipoChamado, PrioridadeChamado, StatusChamado, DashboardChamados }

export interface ChamadoResumo {
  id: string
  numero: number
  titulo: string
  descricao: string
  tipo: TipoChamado
  prioridade: PrioridadeChamado
  status: StatusChamado
  prazo: string
  atrasado: boolean
  ambienteNomeSnapshot: string | null
  blocoNomeSnapshot: string | null
  patrimony: string | null
  descricaoBemSnapshot: string | null
  assumidoEm: string | null
  finalizadoEm: string | null
  criadoEm: string
  descricaoExecucao: string | null
  criadoPor: { id: string; nome: string }
  responsavel: { id: string; nome: string } | null
  tenant: { nome: string; slug: string }
  // Fiscais — presentes SOMENTE quando o usuário é admin
  fornecedor?: string | null
  numeroOrdemCompra?: string | null
  valorGastoCentavos?: number | null
}

export interface CriarChamadoInput {
  titulo: string
  descricao: string
  tipo: TipoChamado
  prioridade?: PrioridadeChamado
  prazo: string
  ambienteId: string
  trilogoAssetId?: number
  patrimony?: string
  descricaoBem?: string
  fotoAbertura?: string | null
  responsavelId?: string
}

export interface FinalizarChamadoInput {
  descricaoExecucao: string
  fotoExecucao?: string | null
}

export interface EditarFiscalInput {
  fornecedor?: string | null
  numeroOrdemCompra?: string | null
  valorGastoCentavos?: number | null
}

export interface FiltrosChamados {
  status?: StatusChamado
  prioridade?: PrioridadeChamado
  tipo?: TipoChamado
  responsavelId?: string
  atrasados?: boolean
}

function unwrap<T>(res: { data: T }): T {
  return res.data
}

export async function listar(filtros: FiltrosChamados = {}): Promise<ChamadoResumo[]> {
  const params = new URLSearchParams()
  if (filtros.status) params.set('status', filtros.status)
  if (filtros.prioridade) params.set('prioridade', filtros.prioridade)
  if (filtros.tipo) params.set('tipo', filtros.tipo)
  if (filtros.responsavelId) params.set('responsavelId', filtros.responsavelId)
  if (filtros.atrasados) params.set('atrasados', 'true')
  const qs = params.toString()
  return unwrap(await api.get<{ data: ChamadoResumo[] }>(`chamados${qs ? `?${qs}` : ''}`))
}

export async function buscar(id: string): Promise<ChamadoResumo> {
  return unwrap(await api.get<{ data: ChamadoResumo }>(`chamados/${id}`))
}

export async function criar(input: CriarChamadoInput): Promise<{ id: string; numero: number }> {
  return unwrap(await api.post<{ data: { id: string; numero: number } }>('chamados', input))
}

export async function assumir(
  id: string,
  prioridade?: PrioridadeChamado,
): Promise<{ id: string; status: StatusChamado }> {
  return unwrap(
    await api.post<{ data: { id: string; status: StatusChamado } }>(
      `chamados/${id}/assumir`,
      prioridade ? { prioridade } : {},
    ),
  )
}

export async function atribuir(
  id: string,
  responsavelId: string,
  prioridade?: PrioridadeChamado,
): Promise<{ id: string; status: StatusChamado }> {
  return unwrap(
    await api.post<{ data: { id: string; status: StatusChamado } }>(`chamados/${id}/atribuir`, {
      responsavelId,
      ...(prioridade ? { prioridade } : {}),
    }),
  )
}

export async function finalizar(
  id: string,
  input: FinalizarChamadoInput,
): Promise<{ id: string; status: StatusChamado }> {
  return unwrap(
    await api.post<{ data: { id: string; status: StatusChamado } }>(
      `chamados/${id}/finalizar`,
      input,
    ),
  )
}

export async function cancelar(id: string): Promise<{ id: string; status: StatusChamado }> {
  return unwrap(
    await api.post<{ data: { id: string; status: StatusChamado } }>(`chamados/${id}/cancelar`, {}),
  )
}

// O servidor retorna só o resumo + campos fiscais (não o ChamadoResumo completo)
export interface ChamadoFiscalAtualizado {
  id: string
  numero: number
  status: StatusChamado
  prioridade: PrioridadeChamado
  criadoEm: string
  fornecedor: string | null
  numeroOrdemCompra: string | null
  valorGastoCentavos: number | null
}

export async function editarFiscal(
  id: string,
  input: EditarFiscalInput,
): Promise<ChamadoFiscalAtualizado> {
  return unwrap(await api.patch<{ data: ChamadoFiscalAtualizado }>(`chamados/${id}`, input))
}

export async function buscarFotos(
  id: string,
): Promise<{ fotoAbertura: string | null; fotoExecucao: string | null }> {
  return unwrap(
    await api.get<{ data: { fotoAbertura: string | null; fotoExecucao: string | null } }>(
      `chamados/${id}/foto`,
    ),
  )
}

export async function dashboard(periodo?: { de?: string; ate?: string }): Promise<DashboardChamados> {
  const params = new URLSearchParams()
  if (periodo?.de) params.set('de', periodo.de)
  if (periodo?.ate) params.set('ate', periodo.ate)
  const qs = params.toString()
  return unwrap(
    await api.get<{ data: DashboardChamados }>(`chamados/dashboard${qs ? `?${qs}` : ''}`),
  )
}
