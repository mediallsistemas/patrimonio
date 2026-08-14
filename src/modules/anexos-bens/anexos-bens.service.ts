import { prisma } from '@/lib/db'
import { filtroEscopo } from '@/modules/auth/tenant-filter'
import { conteudoBateComMime } from './anexos-bens.arquivo'
import {
  MAX_ARQUIVO_BYTES,
  MAX_TOTAL_POR_BEM_BYTES,
  bytesDeBase64,
  formatarBytes,
} from './anexos-bens.types'
import type { EscopoLeitura } from '@/modules/auth/tenant-filter'
import type { CriarAnexoBemInput } from './anexos-bens.types'

export interface AnexoBemMeta {
  id: string
  trilogoAssetId: number
  patrimony: string
  nome: string
  mimeType: string
  tamanhoBytes: number
  descricao: string | null
  criadoEm: Date
  criadoPor: { nome: string }
}

export interface AnexoBemConteudo {
  nome: string
  mimeType: string
  conteudo: string
}

export type ResultadoCriacao =
  | { ok: true; anexo: AnexoBemMeta }
  | { ok: false; erro: string }

const META_SELECT = {
  id: true,
  trilogoAssetId: true,
  patrimony: true,
  nome: true,
  mimeType: true,
  tamanhoBytes: true,
  descricao: true,
  criadoEm: true,
  criadoPor: { select: { nome: true } },
} as const

/**
 * Metadados dos anexos ativos das unidades do solicitante — nunca o conteudo,
 * que e pesado e so e lido sob demanda por `buscarConteudo`.
 *
 * O escopo e obrigatorio de proposito: sem ele, um `id` de anexo (ou de bem do
 * Trilogo, que e sequencial numa instancia compartilhada entre hospitais)
 * viraria uma varredura enumeravel entre unidades.
 */
export async function listar(escopo: EscopoLeitura): Promise<AnexoBemMeta[]> {
  try {
    return await prisma.anexoBem.findMany({
      where: { deletadoEm: null, ...filtroEscopo(escopo) },
      orderBy: { criadoEm: 'desc' },
      select: META_SELECT,
    })
  } catch (error) {
    console.error('[anexos-bens.service] listar:', error)
    throw error
  }
}

/** Soma dos anexos ativos de um bem, dentro do escopo — base da cota. */
async function bytesUsadosNoBem(trilogoAssetId: number, escopo: EscopoLeitura): Promise<number> {
  const agregado = await prisma.anexoBem.aggregate({
    where: { trilogoAssetId, deletadoEm: null, ...filtroEscopo(escopo) },
    _sum: { tamanhoBytes: true },
  })
  return agregado._sum.tamanhoBytes ?? 0
}

/**
 * Cria o anexo depois de checar, nesta ordem: tamanho real (o base64 pode
 * mentir sobre o que o cliente prometeu), assinatura do arquivo contra o
 * mimeType declarado e cota somada do bem.
 *
 * Violacao de regra volta como `{ ok: false }` — nao como excecao — porque e
 * resposta 400 esperada, nao falha de servidor.
 */
export async function criar(
  input: CriarAnexoBemInput,
  criadoPorId: string,
  tenantId: string | null,
  escopo: EscopoLeitura,
): Promise<ResultadoCriacao> {
  try {
    const tamanhoBytes = bytesDeBase64(input.conteudo)

    if (tamanhoBytes === 0) {
      return { ok: false, erro: 'Arquivo vazio' }
    }
    if (tamanhoBytes > MAX_ARQUIVO_BYTES) {
      return {
        ok: false,
        erro: `Arquivo de ${formatarBytes(tamanhoBytes)} excede o limite de ${formatarBytes(MAX_ARQUIVO_BYTES)} por anexo`,
      }
    }
    if (!conteudoBateComMime(input.conteudo, input.mimeType)) {
      return { ok: false, erro: 'O conteúdo do arquivo não corresponde ao tipo informado' }
    }

    const usados = await bytesUsadosNoBem(input.trilogoAssetId, escopo)
    if (usados + tamanhoBytes > MAX_TOTAL_POR_BEM_BYTES) {
      const livre = Math.max(0, MAX_TOTAL_POR_BEM_BYTES - usados)
      return {
        ok: false,
        erro: `Limite de ${formatarBytes(MAX_TOTAL_POR_BEM_BYTES)} em anexos por bem atingido. Espaço livre: ${formatarBytes(livre)}`,
      }
    }

    const anexo = await prisma.anexoBem.create({
      data: {
        trilogoAssetId: input.trilogoAssetId,
        patrimony: input.patrimony,
        companyId: input.companyId,
        nome: input.nome,
        mimeType: input.mimeType,
        descricao: input.descricao ?? null,
        conteudo: input.conteudo,
        tamanhoBytes,
        criadoPorId,
        tenantId,
      },
      select: META_SELECT,
    })

    return { ok: true, anexo }
  } catch (error) {
    console.error('[anexos-bens.service] criar:', error)
    throw error
  }
}

/** Conteudo de um anexo ativo, se estiver no escopo do solicitante. */
export async function buscarConteudo(
  id: string,
  escopo: EscopoLeitura,
): Promise<AnexoBemConteudo | null> {
  try {
    return await prisma.anexoBem.findFirst({
      where: { id, deletadoEm: null, ...filtroEscopo(escopo) },
      select: { nome: true, mimeType: true, conteudo: true },
    })
  } catch (error) {
    console.error('[anexos-bens.service] buscarConteudo:', error)
    throw error
  }
}

/**
 * Remocao logica. O conteudo permanece no banco (auditoria de patrimonio),
 * mas o anexo some das listagens e deixa de contar na cota do bem.
 */
export async function remover(
  id: string,
  deletadoPorId: string,
  escopo: EscopoLeitura,
): Promise<boolean> {
  try {
    const existente = await prisma.anexoBem.findFirst({
      where: { id, deletadoEm: null, ...filtroEscopo(escopo) },
      select: { id: true },
    })
    if (!existente) return false

    await prisma.anexoBem.update({
      where: { id },
      data: { deletadoEm: new Date(), deletadoPorId },
    })
    return true
  } catch (error) {
    console.error('[anexos-bens.service] remover:', error)
    throw error
  }
}
