export type TipoAlteracao = 'eletrica' | 'hidraulica' | 'patrimonio'
export type TamanhoCilindro = 'P7' | 'P10' | 'P45' | 'P50'
export type Etapa =
  | 'inicio'
  | 'medicoes'
  | 'backup'
  | 'abastecimento_pergunta'
  | 'abastecimento_detalhe'
  | 'alteracao_pergunta'
  | 'alteracao_detalhe'
  | 'trilogo'
  | 'resumo'

export interface Medicoes {
  purezaO2: string
  pressaoO2: string
  pressaoAr: string
}

export interface DadosAbastecimento {
  quantidade: string
  tamanho: TamanhoCilindro | null
}

export interface DetalheAlteracao {
  tipo: TipoAlteracao | null
  descricao: string
  foto: string | null
  trilogoChamado: boolean | null
}

export interface ResumoInspecao {
  temAbastecimento: boolean
  qtdCilindros?: number
  tamCilindros?: string
  temAlteracao: boolean
  tipo?: TipoAlteracao
}

export const TIPOS_ALTERACAO: { value: TipoAlteracao; label: string; color: string }[] = [
  { value: 'eletrica',   label: 'Elétrica',   color: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
  { value: 'hidraulica', label: 'Hidráulica', color: 'border-blue-400 bg-blue-50 text-blue-700' },
  { value: 'patrimonio', label: 'Patrimônio', color: 'border-purple-400 bg-purple-50 text-purple-700' },
]

export const TAMANHOS_CILINDRO: TamanhoCilindro[] = ['P7', 'P10', 'P45', 'P50']

export const ETAPA_NUM: Record<Etapa, number> = {
  inicio: 0,
  medicoes: 1,
  backup: 2,
  abastecimento_pergunta: 3,
  abastecimento_detalhe: 3.5,
  alteracao_pergunta: 4,
  alteracao_detalhe: 5,
  trilogo: 6,
  resumo: 7,
}

export const TOTAL_ETAPAS = 6
