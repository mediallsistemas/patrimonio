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

// Medições da inspeção de gases que aceitam foto do relógio
export const MEDICOES_GAS = ['purezaO2', 'pressaoO2', 'pressaoAr'] as const
export const MedicaoGasSchema = z.enum(MEDICOES_GAS)

const FotoMedicaoSchema = z.string().max(2_000_000) // ~1.5MB imagem base64

// Foto do relógio de cada medição — todas opcionais
export const FotosMedicoesSchema = z.object({
  purezaO2: FotoMedicaoSchema.nullish(),
  pressaoO2: FotoMedicaoSchema.nullish(),
  pressaoAr: FotoMedicaoSchema.nullish(),
})

// Uma linha do abastecimento: tamanho ('P10', '3 m³', '2,5 m³'...) e quantidade
export const CilindroAbastecidoSchema = z.object({
  tamanho: z.string().trim().min(1).max(20),
  quantidade: z.number().int().min(1).max(9999),
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
    // Um tamanho só — formato anterior à lista `cilindros`, ainda aceito
    qtdCilindros: z.number().int().min(1).optional().nullable(),
    tamCilindro: z.string().optional().nullable(),
    cilindros: z.array(CilindroAbastecidoSchema).max(20).optional(),
    fotosMedicoes: FotosMedicoesSchema.optional(),
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

export type MedicaoGas = z.infer<typeof MedicaoGasSchema>
export type CilindroAbastecidoInput = z.infer<typeof CilindroAbastecidoSchema>
export type RegistroAmbienteInput = z.infer<typeof RegistroAmbienteSchema>
export type CreateRondaInput = z.infer<typeof CreateRondaSchema>
export type FiltrosRondaInput = z.infer<typeof FiltrosRondaSchema>
