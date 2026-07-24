import { api } from '@/services/api'

// Wrappers fetch do domínio de chamados — usados apenas pelos hooks.
// Tipos espelham as respostas da API (fiscais só chegam para admin).

export type TipoChamado =
  | 'civil'
  | 'eletrica'
  | 'hidraulica'
  | 'climatizacao'
  | 'gases_medicinais'
  | 'geradores'
  | 'obras_reformas'
  | 'pintura'
  | 'marcenaria'
  | 'serralheria'
  | 'drywall_forros'
  | 'cobertura'
  | 'impermeabilizacao'
  | 'rede_logica_ti'
  | 'seguranca_eletronica'
  | 'jardinagem'
  | 'limpeza_tecnica'
  | 'dedetizacao'
  | 'elevadores'
  | 'outros'

export type PrioridadeChamado = 'baixa' | 'media' | 'alta' | 'urgente'
export type StatusChamado = 'aberto' | 'em_execucao' | 'finalizado' | 'cancelado'

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
  observacaoFinal: string | null
  criadoPor: { id: string; nome: string }
  responsavel: { id: string; nome: string } | null
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
  observacaoFinal?: string
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

export interface DashboardChamados {
  total: number
  finalizados: number
  emExecucao: number
  abertos: number
  atrasados: number
  valorGastoCentavos: number
  porStatus: { status: string; qtde: number }[]
  porPrioridade: { prioridade: string; qtde: number }[]
  porTipo: { tipo: string; qtde: number }[]
  porResponsavel: { responsavelId: string | null; nome: string; qtde: number }[]
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

export async function editarFiscal(
  id: string,
  input: EditarFiscalInput,
): Promise<ChamadoResumo> {
  return unwrap(await api.patch<{ data: ChamadoResumo }>(`chamados/${id}`, input))
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
