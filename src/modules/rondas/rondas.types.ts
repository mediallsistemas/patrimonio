import { z } from 'zod'

import { TenantIdSchema } from '@/modules/tenants/tenants.types'

export const OcorrenciaDetalheSchema = z.object({
  tipo: z.string().min(1).max(100),
  descricao: z.string().min(1).max(1000),
  foto: z.string().max(2_000_000).optional().nullable(), // ~1.5MB imagem base64
  trilogoChamado: z.boolean(),
  bemPatrimony: z.string().max(120).optional().nullable(),
  bemDescricao: z.string().max(255).optional().nullable(),
})

export const RegistroAmbienteSchema = z.discriminatedUnion('tipoRegistro', [
  z.object({
    tipoRegistro: z.literal('ocorrencia'),
    ambiente: z.string().min(1).max(120),
    temOcorrencia: z.boolean(),
    ocorrencias: z.array(OcorrenciaDetalheSchema).optional(),
  }),
  z.object({
    tipoRegistro: z.literal('gases'),
    ambiente: z.string().min(1).max(120),
    purezaO2: z.number(),
    pressaoO2: z.number(),
    pressaoAr: z.number(),
    backupLigado: z.boolean(),
    temAbastecimento: z.boolean(),
    qtdCilindros: z.number().int().min(1).optional().nullable(),
    tamCilindro: z.string().optional().nullable(),
    temOcorrencia: z.boolean(),
    ocorrencias: z.array(OcorrenciaDetalheSchema).optional(),
  }),
])

export const CreateRondaSchema = z.object({
  ambientes: z.array(RegistroAmbienteSchema).optional(),
})

export const FiltrosRondaSchema = z.object({
  tenantId: TenantIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export type RegistroAmbienteInput = z.infer<typeof RegistroAmbienteSchema>
export type CreateRondaInput = z.infer<typeof CreateRondaSchema>
export type FiltrosRondaInput = z.infer<typeof FiltrosRondaSchema>
