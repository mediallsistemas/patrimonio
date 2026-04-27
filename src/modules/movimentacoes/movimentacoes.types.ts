import { z } from 'zod'

export const CriarMovimentacaoSchema = z.object({
  pessoaId: z.string().uuid('pessoaId deve ser um UUID válido'),
  tipo: z.enum(['retirada', 'devolucao']),
  tenantSlug: z.string().optional(),
})

export type CriarMovimentacaoInput = z.infer<typeof CriarMovimentacaoSchema>

export interface MovimentacaoItem {
  id: string
  pessoa_id: string
  tipo: string
  data_hora: Date
  pessoa_nome: string
  pessoa_cpf: string
}

export interface MovimentacoesPorDia {
  data: string
  retiradas: number
  devolucoes: number
}

export class NenhumaPendenteError extends Error {
  constructor() {
    super('Nenhuma retirada pendente para devolver')
    this.name = 'NenhumaPendenteError'
  }
}
