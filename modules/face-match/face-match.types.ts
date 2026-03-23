import { z } from 'zod'

export const VerificarFaceSchema = z.object({
  descriptor: z
    .array(z.number())
    .length(128, 'Descriptor deve ter exatamente 128 valores'),
  tenantSlug: z.string().optional(),
})

export type VerificarFaceInput = z.infer<typeof VerificarFaceSchema>

export interface PessoaFace {
  id: string
  faceDescriptor: string
  nome: string
  cpf: string
  criadoEm: Date
}

type ResultadoNaoEncontrado = { encontrado: false }
type ResultadoEncontrado = {
  encontrado: true
  pessoa: { id: string; nome: string; cpf: string; criadoEm: Date }
  pendentes: number
}

export type ResultadoFaceMatch = ResultadoNaoEncontrado | ResultadoEncontrado
