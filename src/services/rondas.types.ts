export interface CriadoPor {
  id: string
  nome: string
}

export interface RondaTenant {
  id: string
  nome: string
  slug: string
}

export interface OcorrenciaDetalhe {
  id: string
  tipo: string
  descricao: string
  foto: string | null          // null na view do operador (carregado lazy)
  trilogoChamado: boolean
  bemPatrimony: string | null
  bemDescricao: string | null
}

// Medições da inspeção de gases que aceitam foto do relógio
export type MedicaoGas = 'purezaO2' | 'pressaoO2' | 'pressaoAr'

export interface RegistroAmbiente {
  id: string
  ambiente: string
  tipoRegistro?: string        // 'ocorrencia' | 'gases'
  temOcorrencia: boolean
  concluidoEm: string
  // gases
  purezaO2?: number | null
  pressaoO2?: number | null
  pressaoAr?: number | null
  // Quais medições têm foto do relógio; a foto vem sob demanda (buscarFotoMedicao)
  fotosMedicoes?: { medicao: string }[]
  backupLigado?: boolean | null
  temAbastecimento?: boolean | null
  // Resumo do abastecimento; registros anteriores à lista `cilindros` só têm estes
  qtdCilindros?: number | null
  tamCilindro?: string | null
  cilindros?: { tamanho: string; quantidade: number }[]
  ocorrencias: OcorrenciaDetalhe[]
}

export interface Ronda {
  id: string
  iniciadoEm: string
  finalizadoEm: string | null
  criadoPorId?: string         // legado — manter por compatibilidade
  criadoPor?: CriadoPor        // novo campo com nome
  tenantId?: string
  tenant?: RondaTenant
  ambientes: RegistroAmbiente[]
}
