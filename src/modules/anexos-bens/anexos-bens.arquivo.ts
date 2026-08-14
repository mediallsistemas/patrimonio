import type { MimeAnexo } from './anexos-bens.types'

/**
 * Validacao de tipo pelos bytes reais do arquivo, nao pelo mimeType declarado
 * (que o cliente escolhe). Sem isso, "mimeType: image/png" com um executavel
 * dentro passaria e o navegador de quem baixasse decidiria o que fazer.
 *
 * Assinaturas cobrem familias, nao formatos exatos: docx/xlsx sao ZIP e
 * doc/xls sao OLE2, entao a checagem e "o arquivo pertence a familia que o
 * mimeType promete".
 */
type Familia = 'jpeg' | 'png' | 'gif' | 'webp' | 'pdf' | 'zip' | 'ole2' | 'texto'

const FAMILIA_ESPERADA: Record<MimeAnexo, Familia> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/msword': 'ole2',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'zip',
  'application/vnd.ms-excel': 'ole2',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'zip',
  'text/plain': 'texto',
  'text/csv': 'texto',
}

function comeca(bytes: Buffer, assinatura: number[]): boolean {
  if (bytes.length < assinatura.length) return false
  return assinatura.every((b, i) => bytes[i] === b)
}

function detectarFamilia(bytes: Buffer): Familia | null {
  if (comeca(bytes, [0xff, 0xd8, 0xff])) return 'jpeg'
  if (comeca(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (comeca(bytes, [0x47, 0x49, 0x46, 0x38])) return 'gif'
  // RIFF <4 bytes de tamanho> WEBP
  if (comeca(bytes, [0x52, 0x49, 0x46, 0x46]) && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp'
  if (comeca(bytes, [0x25, 0x50, 0x44, 0x46])) return 'pdf' // %PDF
  if (comeca(bytes, [0x50, 0x4b, 0x03, 0x04])) return 'zip' // PK\x03\x04
  if (comeca(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'ole2'
  // Texto: sem byte nulo no inicio do arquivo (heuristica suficiente aqui —
  // qualquer binario conhecido ja caiu numa assinatura acima).
  if (!bytes.includes(0x00)) return 'texto'
  return null
}

/**
 * `true` se os primeiros bytes do base64 batem com a familia do mimeType.
 * Le so o cabecalho — nao decodifica o arquivo inteiro.
 */
export function conteudoBateComMime(conteudoBase64: string, mimeType: MimeAnexo): boolean {
  // 64 chars de base64 = 48 bytes; suficiente para toda assinatura suportada.
  const cabecalho = Buffer.from(conteudoBase64.replace(/\s/g, '').slice(0, 64), 'base64')
  if (cabecalho.length === 0) return false

  const familia = detectarFamilia(cabecalho)
  return familia !== null && familia === FAMILIA_ESPERADA[mimeType]
}
