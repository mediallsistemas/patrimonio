import { z } from 'zod'

export const CreateAgendamentoSchema = z.object({
  trilogoAssetId: z.number().int().positive(),
  patrimony: z.string().min(1).max(120),
  descricaoBem: z.string().min(1).max(255),
  companyId: z.number().int().positive(),
  companyName: z.string().min(1).max(120),
  ambiente: z.string().min(1).max(120),
  dataAgendada: z.string().datetime({ message: 'dataAgendada deve ser ISO 8601' }),
  titulo: z.string().min(1).max(200),
  observacao: z.string().max(1000).optional(),
})

export const UpdateAgendamentoSchema = z.object({
  status: z.enum(['realizado', 'cancelado']),
  dataRealizada: z.string().datetime().optional(),
})

export type CreateAgendamentoInput = z.infer<typeof CreateAgendamentoSchema>
export type UpdateAgendamentoInput = z.infer<typeof UpdateAgendamentoSchema>
