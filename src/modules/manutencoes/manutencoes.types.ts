import { z } from 'zod'

export const TIPOS_MANUTENCAO = ['eletrica', 'hidraulica', 'patrimonio'] as const
export type TipoManutencao = (typeof TIPOS_MANUTENCAO)[number]

// foto base64 (data URL) — limite ~1.5MB para evitar payloads gigantes (mesmo
// teto usado em outros fluxos do projeto)
const fotoBase64 = z
  .string()
  .min(20, 'Foto obrigatória')
  .max(2_000_000, 'Foto excede o tamanho máximo')

const baseIniciar = z.object({
  descricao: z.string().trim().min(3, 'Descreva o problema').max(2000),
  fotoAntes: fotoBase64,
})

export const IniciarManutencaoSchema = z.discriminatedUnion('tipo', [
  baseIniciar.extend({
    tipo: z.literal('eletrica'),
    ambienteId: z.string().uuid(),
  }),
  baseIniciar.extend({
    tipo: z.literal('hidraulica'),
    ambienteId: z.string().uuid(),
  }),
  baseIniciar.extend({
    tipo: z.literal('patrimonio'),
    trilogoAssetId: z.number().int().positive(),
    patrimony: z.string().trim().min(1),
    descricaoBem: z.string().trim().min(1).max(500),
    subtipoPatrimonio: z.string().trim().min(1, 'Selecione o tipo de manutenção').max(200),
  }),
])
export type IniciarManutencaoInput = z.infer<typeof IniciarManutencaoSchema>

export const FinalizarManutencaoSchema = z.object({
  fotoDepois: fotoBase64,
  observacaoFinal: z.string().trim().max(2000).optional(),
})
export type FinalizarManutencaoInput = z.infer<typeof FinalizarManutencaoSchema>
