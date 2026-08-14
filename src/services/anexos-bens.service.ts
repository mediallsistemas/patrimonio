import { api } from '@/services/api'
import type { MimeAnexo } from '@/modules/anexos-bens/anexos-bens.types'

export interface AnexoBem {
  id: string
  trilogoAssetId: number
  patrimony: string
  nome: string
  mimeType: MimeAnexo
  tamanhoBytes: number
  descricao: string | null
  criadoEm: string
  criadoPor: { nome: string }
}

export interface CriarAnexoInput {
  trilogoAssetId: number
  patrimony: string
  companyId: number
  nome: string
  mimeType: MimeAnexo
  descricao?: string
  /** base64 puro, sem o prefixo `data:...;base64,` */
  conteudo: string
}

interface ConteudoAnexo {
  nome: string
  mimeType: string
  conteudo: string
}

export async function listar(): Promise<AnexoBem[]> {
  const json = await api.get<{ data: AnexoBem[] }>('bens/anexos')
  return json.data ?? []
}

export async function criar(input: CriarAnexoInput): Promise<AnexoBem> {
  const json = await api.post<{ data: AnexoBem }>('bens/anexos', input)
  return json.data
}

export async function remover(id: string): Promise<void> {
  await api.delete<{ data: { id: string } }>(`bens/anexos/${id}`)
}

export async function buscarConteudo(id: string): Promise<ConteudoAnexo> {
  const json = await api.get<{ data: ConteudoAnexo }>(`bens/anexos/${id}`)
  return json.data
}
