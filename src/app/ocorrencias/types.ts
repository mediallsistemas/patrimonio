import type React from 'react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type TipoOcorrencia = 'eletrica' | 'hidraulica' | 'patrimonio'
export type TamanhoCilindro = 'P7' | 'P10' | 'P45' | 'P50'
export type TipoAmbiente = 'ocorrencia' | 'gases'

export type Etapa =
  | 'inicio'
  | 'blocos'
  | 'locais'
  | 'bloco_concluido'
  | 'ocorrencia_pergunta'
  | 'ocorrencia_detalhe'
  | 'patrimonio_bem'
  | 'trilogo'
  | 'gases_medicoes'
  | 'gases_backup'
  | 'gases_abastecimento'
  | 'gases_abastecimento_detalhe'
  | 'confirmar_abandono'
  | 'resumo_final'

export interface Local {
  nome: string
  tipo: TipoAmbiente
}

export interface Bloco {
  nome: string
  locais: Local[]
}

export interface RegistroConcluido {
  bloco: string
  local: string
  tipo: TipoAmbiente
  temOcorrencia: boolean
  tiposOcorrencia?: TipoOcorrencia[]
  purezaO2?: number
  pressaoO2?: number
  pressaoAr?: number
  backupLigado?: boolean
  temAbastecimento?: boolean
  qtdCilindros?: number | null
  tamCilindro?: string | null
}

export interface BemSelecionado {
  id: number
  patrimony: string
  descricao: string
}

export interface DetalheOcorrencia {
  tipo: TipoOcorrencia | null
  descricao: string
  foto: string | null
  trilogoChamado: boolean
  bem: BemSelecionado | null
}

export function detalheVazio(): DetalheOcorrencia {
  return { tipo: null, descricao: '', foto: null, trilogoChamado: false, bem: null }
}

export interface DraftEstado {
  rondaId: string | null
  etapa: Etapa
  blocoSelecionado: string | null
  localSelecionado: Local | null
  concluidos: RegistroConcluido[]
  detalhes: DetalheOcorrencia[]
  medicoes: { purezaO2: string; pressaoO2: string; pressaoAr: string }
  backupLigado: boolean | null
  abastecimento: { quantidade: string; tamanho: TamanhoCilindro | null }
  iniciadoEm: string
}

// ── Config ─────────────────────────────────────────────────────────────────────

export const TIPOS_OCORRENCIA: { value: TipoOcorrencia; label: string; active: string }[] = [
  { value: 'eletrica',   label: 'Elétrica',   active: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
  { value: 'hidraulica', label: 'Hidráulica', active: 'border-blue-400 bg-blue-50 text-blue-700' },
  { value: 'patrimonio', label: 'Patrimônio', active: 'border-purple-400 bg-purple-50 text-purple-700' },
]

export const TAMANHOS_CILINDRO: TamanhoCilindro[] = ['P7', 'P10', 'P45', 'P50']
export const DRAFT_DEBOUNCE_MS = 1500

// ── Tipos de blocos/ambientes dinâmicos (vindos da API) ───────────────────────

export interface AmbienteAPI {
  id: string
  nome: string
  tipo: TipoAmbiente
  ordem: number
}

export interface BlocoAPI {
  id: string
  nome: string
  ordem: number
  ambientes: AmbienteAPI[]
}

// ── Hook state interface ───────────────────────────────────────────────────────

export interface OcorrenciaRondaState {
  rondaIniciada: boolean
  estado: DraftEstado
  searchBlocos: string
  searchLocais: string
  submitting: boolean
  errors: Record<string, string>
  showCheck: boolean
  draftServidor: DraftEstado | null
  mostrarBanner: boolean
  totalLocais: number
  totalFeitos: number
  progresso: number
  blocos: BlocoAPI[]
  loadingBlocos: boolean
  loadingDraft: boolean
  blocoAtual: BlocoAPI | undefined
  blocosFiltrados: BlocoAPI[]
  locaisFiltrados: AmbienteAPI[]
  setSearchBlocos: (v: string) => void
  setSearchLocais: (v: string) => void
  atualizar: (parcial: Partial<DraftEstado>) => void
  iniciar: () => Promise<void>
  retomar: () => void
  descartarDraft: () => void
  feitosNoBloco: (nomeBloco: string) => number
  localFeito: (nomeBloco: string, nomeLocal: string) => boolean
  blocoCompleto: (bloco: BlocoAPI) => boolean
  selecionarBloco: (bloco: BlocoAPI) => void
  selecionarLocal: (local: AmbienteAPI) => void
  salvarLocal: (temOcorrencia: boolean) => Promise<void>
  finalizarRonda: () => Promise<void>
  abandonar: () => void
  handleFoto: (e: React.ChangeEvent<HTMLInputElement>, index?: number) => void
  validarMedicoes: () => Record<string, string>
  validarAbastecimento: () => Record<string, string>
  atualizarDetalhe: (index: number, parcial: Partial<DetalheOcorrencia>) => void
  adicionarDetalhe: () => void
  removerDetalhe: (index: number) => void
  validarDetalhe: () => Record<string, string>
  selecionarBem: (bem: BemSelecionado) => void
  setFieldErrors: (e: Record<string, string>) => void
}

export function estadoInicial(): DraftEstado {
  return {
    rondaId: null,
    etapa: 'blocos',
    blocoSelecionado: null,
    localSelecionado: null,
    concluidos: [],
    detalhes: [detalheVazio()],
    medicoes: { purezaO2: '', pressaoO2: '', pressaoAr: '' },
    backupLigado: null,
    abastecimento: { quantidade: '', tamanho: null },
    iniciadoEm: new Date().toISOString(),
  }
}
