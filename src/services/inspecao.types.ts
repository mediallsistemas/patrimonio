export interface Alteracao {
  id: string
  tipo: string
  descricao: string
  trilogoChamado: boolean
}

export interface Abastecimento {
  quantidade: number
  tamanho: string
}

export interface AmbienteInspecionado {
  id: string
  ambiente: string
  purezaO2: number
  pressaoO2: number
  pressaoAr: number
  backupLigado: boolean
  temAbastecimento: boolean
  temAlteracao: boolean
  concluidoEm: string
  abastecimento: Abastecimento | null
  alteracao: Alteracao | null
}

export interface RodadaInspecao {
  id: string
  iniciadoEm: string
  finalizadoEm: string | null
  ambientes: AmbienteInspecionado[]
}
