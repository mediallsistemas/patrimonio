import { prisma } from '@/lib/db'
import { resolverAmbienteDoLink, type ResolucaoAmbiente } from './ambiente-do-link'

const TRILOGO_TOKEN = process.env.TRILOGO_TOKEN ?? ''
const TRILOGO_BASE = process.env.TRILOGO_BASE_URL ?? 'https://public.api.trilogo.app/api'

// Bens por companyId — 10 min por instância. O /asset devolve a base inteira
// (~12 mil bens, bem acima dos 2 MB do cache de fetch do Next), então o cache
// fica em memória, como a rota pública já fazia.
const cacheBens = new Map<number, { data: BemPublico[]; at: number }>()
const TTL_BENS = 10 * 60 * 1000

export interface BemPublico {
  id: number
  patrimony: string
  description: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  departmentFullAddress: string
  status: number
  assetTypeName: string
  companyId: number
  companyName: string
  coverPermalink: string | null
  creationDate: string | null
}

export interface CriarLinkAmbienteInput {
  companyId: number
  projeto: string
  ambiente: string
  tenantId: string
}

export async function criarOuBuscarLinkAmbiente(input: CriarLinkAmbienteInput): Promise<string> {
  const where = { companyId_projeto_ambiente: { companyId: input.companyId, projeto: input.projeto, ambiente: input.ambiente } }
  try {
    const result = await prisma.linkPublicoBem.upsert({
      where,
      update: {},
      create: { companyId: input.companyId, projeto: input.projeto, ambiente: input.ambiente, tenantId: input.tenantId },
      select: { id: true },
    })
    return result.id
  } catch (error: unknown) {
    // P2002 = unique constraint violation (race condition): o registro foi criado por outra requisição simultânea
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2002') {
      const existente = await prisma.linkPublicoBem.findUnique({ where, select: { id: true } })
      if (existente) return existente.id
    }
    console.error('[links-publicos.service] criarOuBuscarLinkAmbiente:', error)
    throw error
  }
}

export async function buscarLinkAmbiente(id: string) {
  try {
    return await prisma.linkPublicoBem.findUnique({
      where: { id },
      select: { id: true, companyId: true, projeto: true, ambiente: true },
    })
  } catch (error) {
    console.error('[links-publicos.service] buscarLinkAmbiente:', error)
    throw error
  }
}

async function listarBensDaEmpresa(companyId: number): Promise<BemPublico[]> {
  const hit = cacheBens.get(companyId)
  if (hit && Date.now() - hit.at < TTL_BENS) return hit.data

  const res = await fetch(`${TRILOGO_BASE}/asset`, {
    headers: { accept: 'application/json', token: TRILOGO_TOKEN },
  })
  if (!res.ok) throw new Error(`Trilogo assets error: ${res.status}`)

  const all = (await res.json()) as BemPublico[]
  const daEmpresa = all.filter((a) => String(a.companyId) === String(companyId))
  cacheBens.set(companyId, { data: daEmpresa, at: Date.now() })
  return daEmpresa
}

/**
 * Bens que o QR do link mostra hoje. Segue o ambiente quando ele foi renomeado
 * ou subdividido no Trílogo; se não der para saber qual é, volta 'nao-encontrado'
 * (ver `ambiente-do-link.ts`). Lança se o Trílogo falhar.
 */
export async function listarBensDoLink(link: {
  companyId: number
  projeto: string
  ambiente: string
}): Promise<ResolucaoAmbiente<BemPublico>> {
  const bens = await listarBensDaEmpresa(link.companyId)
  return resolverAmbienteDoLink(link, bens)
}

export async function listarAgendamentosPorAssets(trilogoAssetIds: number[]) {
  try {
    if (trilogoAssetIds.length === 0) return []
    return await prisma.agendamentoManutencao.findMany({
      where: { trilogoAssetId: { in: trilogoAssetIds }, status: { not: 'cancelado' } },
      orderBy: { dataAgendada: 'asc' },
      select: {
        id: true,
        trilogoAssetId: true,
        titulo: true,
        dataAgendada: true,
        dataRealizada: true,
        observacao: true,
        status: true,
        ambiente: true,
      },
    })
  } catch (error) {
    console.error('[links-publicos.service] listarAgendamentosPorAssets:', error)
    throw error
  }
}
