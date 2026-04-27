import { z } from 'zod'

export const CreateAmbienteSchema = z.object({
  nome: z.string().min(1).max(120),
  ordem: z.number().int().min(0).optional(),
  tipo: z.enum(['ocorrencia', 'gases']).default('ocorrencia'),
})

export type CreateAmbienteInput = z.infer<typeof CreateAmbienteSchema>
