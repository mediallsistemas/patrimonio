import { describe, it, expect } from 'vitest'

import { conteudoBateComMime } from './anexos-bens.arquivo'
import {
  CriarAnexoBemSchema,
  MAX_ARQUIVO_BYTES,
  MAX_CONTEUDO_BASE64_CHARS,
  bytesDeBase64,
  ehMimePermitido,
} from './anexos-bens.types'

function base64De(bytes: number[]): string {
  return Buffer.from(bytes).toString('base64')
}

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]
const ZIP = [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]
const OLE2 = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
const EXE = [0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]

describe('anexos-bens — validação de conteúdo por assinatura', () => {
  it('aceita arquivo cuja assinatura bate com o mimeType', () => {
    expect(conteudoBateComMime(base64De(PNG), 'image/png')).toBe(true)
    expect(conteudoBateComMime(base64De(JPEG), 'image/jpeg')).toBe(true)
    expect(conteudoBateComMime(base64De(PDF), 'application/pdf')).toBe(true)
  })

  // O mimeType vem do cliente; sem esta checagem um executável entraria no banco
  // rotulado como imagem e sairia como download "confiável" para outro admin.
  it('recusa binário disfarçado de imagem', () => {
    expect(conteudoBateComMime(base64De(EXE), 'image/png')).toBe(false)
    expect(conteudoBateComMime(base64De(PDF), 'image/jpeg')).toBe(false)
  })

  it('trata família, não formato exato: docx/xlsx são ZIP e doc/xls são OLE2', () => {
    expect(conteudoBateComMime(base64De(ZIP), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true)
    expect(conteudoBateComMime(base64De(ZIP), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe(true)
    expect(conteudoBateComMime(base64De(OLE2), 'application/msword')).toBe(true)
    expect(conteudoBateComMime(base64De(OLE2), 'application/vnd.ms-excel')).toBe(true)
    // ZIP não passa como .doc (OLE2) e vice-versa
    expect(conteudoBateComMime(base64De(ZIP), 'application/msword')).toBe(false)
  })

  it('texto passa por ausência de assinatura binária; binário com NUL não', () => {
    expect(conteudoBateComMime(Buffer.from('nome;valor\nA;1').toString('base64'), 'text/csv')).toBe(true)
    expect(conteudoBateComMime(base64De(EXE), 'text/plain')).toBe(false)
  })

  it('recusa conteúdo vazio', () => {
    expect(conteudoBateComMime('', 'application/pdf')).toBe(false)
  })
})

describe('anexos-bens — tamanho', () => {
  it('bytesDeBase64 devolve o tamanho real do arquivo', () => {
    expect(bytesDeBase64(base64De([1, 2, 3]))).toBe(3)
    expect(bytesDeBase64(base64De([1, 2, 3, 4]))).toBe(4)
    expect(bytesDeBase64(base64De(new Array(1000).fill(0xab)))).toBe(1000)
  })

  // O teto do campo base64 tem de caber o teto do arquivo — se alguém subir
  // MAX_ARQUIVO_BYTES sem mexer no outro, o Zod passa a rejeitar antes do
  // service, com mensagem genérica.
  it('o limite de caracteres base64 comporta o limite de bytes', () => {
    expect(MAX_CONTEUDO_BASE64_CHARS).toBeGreaterThan((MAX_ARQUIVO_BYTES * 4) / 3)
  })
})

describe('anexos-bens — schema de criação', () => {
  const valido = {
    trilogoAssetId: 42,
    patrimony: '000123',
    companyId: 168,
    nome: 'nota-fiscal.pdf',
    mimeType: 'application/pdf',
    conteudo: base64De(PDF),
  }

  it('aceita payload válido', () => {
    expect(CriarAnexoBemSchema.safeParse(valido).success).toBe(true)
  })

  it('recusa mimeType fora da lista', () => {
    expect(CriarAnexoBemSchema.safeParse({ ...valido, mimeType: 'application/x-msdownload' }).success).toBe(false)
    expect(ehMimePermitido('application/x-msdownload')).toBe(false)
  })

  it('recusa conteúdo acima do teto', () => {
    const gigante = 'A'.repeat(MAX_CONTEUDO_BASE64_CHARS + 1)
    expect(CriarAnexoBemSchema.safeParse({ ...valido, conteudo: gigante }).success).toBe(false)
  })

  it('recusa conteúdo que não é base64 (ex.: data URL colada inteira)', () => {
    expect(CriarAnexoBemSchema.safeParse({ ...valido, conteudo: 'data:application/pdf;base64,JVBERi0=' }).success).toBe(false)
  })
})
