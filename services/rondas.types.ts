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

export interface RegistroAmbiente {
  id: string
  ambiente: string
  tipoRegistro?: string        // só presente na view do operador (gases)
  temOcorrencia: boolean
  concluidoEm: string
  // gases (operador)
  purezaO2?: number | null
  pressaoO2?: number | null
  pressaoAr?: number | null
  backupLigado?: boolean | null
  temAbastecimento?: boolean | null
  qtdCilindros?: number | null
  tamCilindro?: string | null
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
