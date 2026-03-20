// ── Template de Formulário ─────────────────────────────────────────────────────

export interface CampoFormulario {
  id: string
  tipo: 'nps' | 'rating' | 'text' | 'select'
  label: string
  obrigatorio: boolean
  opcoes?: string[]  // para tipo 'select'
}

export interface CreateTemplateDto {
  nome: string
  campos: CampoFormulario[]
  ativo?: boolean
}

export interface UpdateTemplateDto {
  nome?: string
  campos?: CampoFormulario[]
  ativo?: boolean
}

// ── Resposta de Formulário ─────────────────────────────────────────────────────

export interface RespostaCampo {
  pergunta: string
  nota?: number
  comentario?: string
}

export interface CreateRespostaDto {
  templateId?: string
  nomePaciente?: string
  cpf?: string
  idade?: number
  genero?: string
  dataInternacao?: string  // ISO date string
  dataAlta?: string        // ISO date string
  setor?: string
  respostas: RespostaCampo[]
  comentarios?: string
}

export interface FiltrosRespostaDto {
  setor?: string
  templateId?: string
  de?: string    // ISO date string
  ate?: string   // ISO date string
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalRespostas: number
  mediaRecomendaria: number | null   // média da pergunta "recomendaria" (escala ou 0/1)
  mediaGeral: number | null
  pctRecomendaria: number            // % que respondeu >= 1 na pergunta "recomendaria"
  porSetor: { setor: string; total: number }[]
}

export interface AnalyticsByPeriod {
  periodo: string
  total: number
  mediaRecomendaria: number | null
}

export interface AnalyticsByDepartment {
  setor: string
  total: number
  mediaRecomendaria: number | null
}
