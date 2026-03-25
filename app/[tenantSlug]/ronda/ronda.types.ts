export type TipoAlteracao = 'eletrica' | 'hidraulica' | 'patrimonio'
export type TamanhoCilindro = 'P7' | 'P10' | 'P45' | 'P50'
export type TipoRegistro = 'ocorrencia' | 'gases'

export interface AmbienteTenant {
  id: string
  nome: string
  ordem: number
  tipo: TipoRegistro
}

export interface RegistroFeito {
  ambienteId: string
  nome: string
  tipo: TipoRegistro
  temOcorrencia: boolean
  purezaO2?: number
  pressaoO2?: number
  pressaoAr?: number
  backupLigado?: boolean
  temAbastecimento?: boolean
  qtdCilindros?: number | null
  tamCilindro?: string | null
  ocorrencia?: {
    tipo: TipoAlteracao
    descricao: string
    foto: string | null
    trilogoChamado: boolean | null
  }
}

export type EtapaAmbiente =
  | 'selecao'
  | 'gases_medicoes'
  | 'gases_backup'
  | 'gases_abastecimento'
  | 'gases_abastecimento_detalhe'
  | 'ocorrencia_pergunta'
  | 'ocorrencia_detalhe'
  | 'trilogo'
  | 'confirmar_abandono'

export interface DraftEstado {
  rondaId: string | null
  registros: RegistroFeito[]
  etapa: EtapaAmbiente
  ambienteSelecionado: AmbienteTenant | null
  medicoes: { purezaO2: string; pressaoO2: string; pressaoAr: string }
  backupLigado: boolean | null
  abastecimento: { quantidade: string; tamanho: TamanhoCilindro | null }
  ocorrencia: { tipo: TipoAlteracao | null; descricao: string; foto: string | null; trilogoChamado: boolean | null }
  iniciadoEm: string
}

export const TIPOS_ALTERACAO: { value: TipoAlteracao; label: string; color: string }[] = [
  { value: 'eletrica',   label: 'Elétrica',   color: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
  { value: 'hidraulica', label: 'Hidráulica', color: 'border-blue-400 bg-blue-50 text-blue-700' },
  { value: 'patrimonio', label: 'Patrimônio', color: 'border-purple-400 bg-purple-50 text-purple-700' },
]

export const TAMANHOS_CILINDRO: TamanhoCilindro[] = ['P7', 'P10', 'P45', 'P50']

export function estadoInicial(): DraftEstado {
  return {
    rondaId: null,
    registros: [],
    etapa: 'selecao',
    ambienteSelecionado: null,
    medicoes: { purezaO2: '', pressaoO2: '', pressaoAr: '' },
    backupLigado: null,
    abastecimento: { quantidade: '', tamanho: null },
    ocorrencia: { tipo: null, descricao: '', foto: null, trilogoChamado: null },
    iniciadoEm: new Date().toISOString(),
  }
}
