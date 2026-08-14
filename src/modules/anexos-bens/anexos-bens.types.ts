import { z } from 'zod'

/**
 * Teto por arquivo.
 *
 * 3 MB nao e um numero arbitrario: o anexo viaja em JSON base64 (mesmo
 * transporte das fotos do resto do sistema) e a Vercel recusa requests com
 * corpo acima de ~4,5 MB. 3 MB viram ~4,19 MB em base64 — o maior valor
 * redondo que ainda cabe com folga para os demais campos.
 *
 * Aumentar daqui exige trocar o transporte (upload direto para storage ou
 * envio em partes), nao so mexer nesta constante.
 */
export const MAX_ARQUIVO_BYTES = 3 * 1024 * 1024

/** Teto somado dos anexos ativos de um mesmo bem. */
export const MAX_TOTAL_POR_BEM_BYTES = 30 * 1024 * 1024

/** Limite do campo base64: 3 MB expandidos (+33%) mais folga do envelope. */
export const MAX_CONTEUDO_BASE64_CHARS = Math.ceil(MAX_ARQUIVO_BYTES / 3) * 4 + 1024

export const MIMES_PERMITIDOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
] as const

export type MimeAnexo = (typeof MIMES_PERMITIDOS)[number]

/** Rotulo curto por tipo, para a lista de anexos na UI. */
export const ROTULO_MIME: Record<MimeAnexo, string> = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
  'image/gif': 'GIF',
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
}

/** Valor do atributo `accept` do input de arquivo. */
export const ACCEPT_ANEXO = MIMES_PERMITIDOS.join(',')

export function ehMimePermitido(mime: string): mime is MimeAnexo {
  return (MIMES_PERMITIDOS as readonly string[]).includes(mime)
}

/** Tamanho real do arquivo a partir do base64, sem decodificar. */
export function bytesDeBase64(base64: string): number {
  const limpo = base64.replace(/\s/g, '')
  const padding = limpo.endsWith('==') ? 2 : limpo.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((limpo.length * 3) / 4) - padding)
}

export function formatarBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const CriarAnexoBemSchema = z.object({
  trilogoAssetId: z.number().int().positive(),
  patrimony: z.string().min(1).max(120),
  companyId: z.number().int().positive(),
  nome: z.string().min(1).max(180),
  mimeType: z.enum(MIMES_PERMITIDOS),
  descricao: z.string().max(500).optional(),
  // base64 puro, sem o prefixo `data:...;base64,` — o cliente tira antes de enviar
  conteudo: z.string().min(1).max(MAX_CONTEUDO_BASE64_CHARS).regex(/^[A-Za-z0-9+/=\s]+$/, 'conteudo deve ser base64'),
})

export type CriarAnexoBemInput = z.infer<typeof CriarAnexoBemSchema>
