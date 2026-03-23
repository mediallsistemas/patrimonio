import { z } from 'zod'

export const OcorrenciaDetalheSchema = z.object({
  tipo: z.string().min(1).max(100),
  descricao: z.string().min(1).max(1000),
  foto: z.string().url().optional(),
  trilogoChamado: z.boolean(),
})

export const RegistroAmbienteSchema = z.object({
  ambiente: z.string().min(1).max(120),
  temOcorrencia: z.boolean(),
  ocorrencia: OcorrenciaDetalheSchema.optional(),
})

export const CreateRondaSchema = z.object({
  ambientes: z.array(RegistroAmbienteSchema).optional(),
})

export const FiltrosRondaSchema = z.object({
  tenantId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export type CreateRondaInput = z.infer<typeof CreateRondaSchema>
export type FiltrosRondaInput = z.infer<typeof FiltrosRondaSchema>
