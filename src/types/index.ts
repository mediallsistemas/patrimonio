export interface Pessoa {
  id: string
  nome: string
  cpf: string
  face_descriptor: string
  created_at: string
}

export interface Movimentacao {
  id: string
  pessoa_id: string
  tipo: 'retirada' | 'devolucao'
  data_hora: string
  pessoa_nome?: string
  pessoa_cpf?: string
}

export interface VerificarFaceRequest {
  descriptor: number[]
}

export interface VerificarFaceResponse {
  encontrado: boolean
  pessoa?: {
    id: string
    nome: string
    cpf: string
    created_at: string
  }
  pendentes?: number
}

export interface DashboardStats {
  totalPessoas: number
  retiradasHoje: number
  devolucoesHoje: number
  totalPendentes: number
  movimentacoesPorDia: { data: string; retiradas: number; devolucoes: number }[]
  recentes: Movimentacao[]
}

export interface CriarPessoa {
  nome: string
  cpf: string
  faceDescriptor: number[]
}

export interface CriarMovimentacao {
  pessoaId: string
  tipo: 'retirada' | 'devolucao'
}
