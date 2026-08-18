import { api } from '@/services/api'

export type TipoManutencao = 'eletrica' | 'hidraulica' | 'predial' | 'patrimonio'

interface IniciarBaseInput {
  descricao: string
  fotoAntes: string
}

interface IniciarAmbienteInput extends IniciarBaseInput {
  tipo: 'eletrica' | 'hidraulica' | 'predial'
  ambienteId: string
}

interface IniciarPatrimonioInput extends IniciarBaseInput {
  tipo: 'patrimonio'
  trilogoAssetId: number
  patrimony: string
  descricaoBem: string
  subtipoPatrimonio: string
}

export type IniciarManutencaoInput = IniciarAmbienteInput | IniciarPatrimonioInput

export interface FinalizarManutencaoInput {
  fotoDepois: string
  observacaoFinal?: string
}

export interface ManutencaoIniciada {
  id: string
  status: string
  iniciadaEm: string
}

export interface ManutencaoFinalizada {
  id: string
  status: string
  finalizadaEm: string
}

interface BemTrilogo {
  id: number
  patrimony: string
  description: string
  departmentFullAddress: string
  assetTypeName: string
}

function unwrap<T>(res: { data?: T } | T): T {
  if (res && typeof res === 'object' && 'data' in res) return (res as { data: T }).data
  return res as T
}

export async function iniciar(input: IniciarManutencaoInput): Promise<ManutencaoIniciada> {
  const res = await api.post<{ data: ManutencaoIniciada }>('me/manutencoes', input)
  return unwrap(res)
}

export async function finalizar(
  id: string,
  input: FinalizarManutencaoInput,
): Promise<ManutencaoFinalizada> {
  const res = await api.post<{ data: ManutencaoFinalizada }>(
    `me/manutencoes/${id}/finalizar`,
    input,
  )
  return unwrap(res)
}

// Manutenção em aberto (não finalizada) da unidade — qualquer operador finaliza.
// `tipo` vem do banco como string; a tela trata tipo desconhecido com fallback.
export interface ManutencaoEmAberto {
  id: string
  tipo: TipoManutencao
  iniciadaEm: string
  descricao: string
  ambienteId: string | null
  ambienteNomeSnapshot: string | null
  blocoNomeSnapshot: string | null
  trilogoAssetId: number | null
  patrimony: string | null
  descricaoBemSnapshot: string | null
  criadoPor: { nome: string }
}

export async function listarEmAberto(): Promise<ManutencaoEmAberto[]> {
  const res = await api.get<{ data: ManutencaoEmAberto[] }>('me/manutencoes')
  return unwrap(res)
}

export async function buscarBemPorPatrimonio(patrimony: string): Promise<BemTrilogo[]> {
  const res = await api.get<{ data: BemTrilogo[] }>(
    `me/bens/buscar?patrimony=${encodeURIComponent(patrimony)}`,
  )
  return unwrap(res)
}

export interface ManutencaoRealizadaResumo {
  id: string
  trilogoAssetId: number
  patrimony: string | null
  descricaoBemSnapshot: string | null
  subtipoPatrimonio: string | null
  descricao: string
  observacaoFinal: string | null
  iniciadaEm: string
  finalizadaEm: string | null
  criadoPor: { nome: string }
}

export interface ManutencaoRealizadaDetalhe extends ManutencaoRealizadaResumo {
  tipo: TipoManutencao
  status: string
  ambienteNomeSnapshot: string | null
  blocoNomeSnapshot: string | null
  fotoAntes: string
  fotoDepois: string | null
}

export async function listarRealizadasPorAssets(assetIds: number[]): Promise<ManutencaoRealizadaResumo[]> {
  if (assetIds.length === 0) return []
  const res = await api.get<{ data: ManutencaoRealizadaResumo[] }>(
    `manutencoes/realizadas?assetIds=${assetIds.join(',')}`,
  )
  return unwrap(res)
}

export async function buscarRealizadaDetalhe(id: string): Promise<ManutencaoRealizadaDetalhe> {
  const res = await api.get<{ data: ManutencaoRealizadaDetalhe }>(
    `manutencoes/realizadas/${id}`,
  )
  return unwrap(res)
}

export interface ManutencaoHistoricoItem {
  id: string
  tipo: TipoManutencao
  status: 'em_andamento' | 'concluida'
  ambienteNomeSnapshot: string | null
  blocoNomeSnapshot: string | null
  patrimony: string | null
  descricaoBemSnapshot: string | null
  subtipoPatrimonio: string | null
  descricao: string
  observacaoFinal: string | null
  iniciadaEm: string
  finalizadaEm: string | null
  criadoPor: { nome: string }
}

export async function listarHistorico(): Promise<ManutencaoHistoricoItem[]> {
  const res = await api.get<{ data: ManutencaoHistoricoItem[] }>('manutencoes/historico')
  return unwrap(res)
}
