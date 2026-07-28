import { prisma } from '@/lib/db'
import { prismaAuth } from '@/lib/db-auth'
import { pertenceAoTenant } from '@/modules/trilogo/escopo'
import type { CreateAmbienteInput } from './ambientes.types'

const TRILOGO_TOKEN = process.env.TRILOGO_TOKEN ?? ''
const TRILOGO_BASE = process.env.TRILOGO_BASE_URL ?? 'https://public.api.trilogo.app/api'

// Cache global de assets brutos do Trilogo (30 min TTL)
let assetsCache: { data: Record<string, unknown>[]; at: number } | null = null
const ASSETS_TTL = 30 * 60 * 1000

async function fetchAllTrilogoAssets(): Promise<Record<string, unknown>[]> {
  if (assetsCache && Date.now() - assetsCache.at < ASSETS_TTL) return assetsCache.data

  const res = await fetch(`${TRILOGO_BASE}/asset`, {
    headers: { accept: 'application/json', token: TRILOGO_TOKEN },
  })
  if (!res.ok) throw new Error(`Trilogo assets error: ${res.status}`)

  const data = (await res.json()) as Record<string, unknown>[]
  // Só salva no cache se a API retornou dados — array vazio pode ser erro silencioso
  if (data.length > 0) assetsCache = { data, at: Date.now() }
  return data
}

export async function sincronizarTenant(
  tenantId: string,
): Promise<{ blocosCriados: number; ambientesCriados: number; ambientesRemovidos: number; blocosRemovidos: number } | null> {
  const tenant = await prismaAuth.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true, nome: true, trilogoCompanyId: true, trilogoProjectName: true },
  })
  if (!tenant?.trilogoCompanyId) return null
  if (!TRILOGO_TOKEN) throw new Error('TRILOGO_TOKEN não configurado')

  const all = await fetchAllTrilogoAssets()

  // Mesma regra da importação de chamados (modules/trilogo/escopo): fecha
  // quando nada identifica a unidade. Antes, tenant sem projeto configurado
  // puxava os bens de toda a empresa para dentro dos próprios ambientes — e a
  // sincronização APAGA o que nao vem na lista, entao errar aqui e destrutivo.
  const vinculo = {
    trilogoCompanyId: tenant.trilogoCompanyId,
    trilogoProjectName: tenant.trilogoProjectName,
    slug: tenant.slug,
    nome: tenant.nome,
  }
  const assets = all.filter((a) => pertenceAoTenant(a, vinculo))

  return sincronizarAmbientesTrilogo(tenantId, assets)
}

export async function listarAmbientes(tenantId: string) {
  try {
    return await prisma.ambienteTenant.findMany({
      where: { tenantId, ativo: true },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
      select: { id: true, nome: true, ordem: true, tipo: true, blocoId: true },
    })
  } catch (error) {
    console.error('[ambientes.service] listarAmbientes:', error)
    throw error
  }
}

export async function listarBlocos(tenantId: string) {
  try {
    return await prisma.blocoTenant.findMany({
      where: { tenantId, ativo: true },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
      select: {
        id: true,
        nome: true,
        ordem: true,
        ambientes: {
          where: { ativo: true },
          orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
          select: { id: true, nome: true, tipo: true, ordem: true },
        },
      },
    })
  } catch (error) {
    console.error('[ambientes.service] listarBlocos:', error)
    throw error
  }
}

export async function criarAmbiente(tenantId: string, input: CreateAmbienteInput) {
  try {
    return await prisma.ambienteTenant.create({
      data: {
        tenantId,
        nome: input.nome,
        ordem: input.ordem ?? 0,
        tipo: input.tipo,
      },
    })
  } catch (error) {
    console.error('[ambientes.service] criarAmbiente:', error)
    throw error
  }
}

// ── Sincronização com Trilogo ─────────────────────────────────────────────────
// Extrai blocos (seg[3]) e ambientes (seg[4]) dos assets do Trilogo e espelha
// exatamente o que vier da API: cria novos, e remove os que não existem mais.
// Rondas históricas não são afetadas — guardam nome como texto, sem FK.

interface TrilogoAsset {
  departmentFullAddress?: string
}

const GAS_KEYWORDS = ['GAS', 'O2', 'OXIG', 'USINA', 'OXIGÊNIO', 'OXIGENIO']

function isGasTipo(text: string): boolean {
  const upper = text.toUpperCase()
  return GAS_KEYWORDS.some((k) => upper.includes(k))
}

export async function sincronizarAmbientesTrilogo(
  tenantId: string,
  assets: TrilogoAsset[],
  blocoFallback = 'Geral',
): Promise<{ blocosCriados: number; ambientesCriados: number; ambientesRemovidos: number; blocosRemovidos: number }> {
  type Pair = { bloco: string; ambiente: string; tipo: 'gases' | 'ocorrencia' }
  const pairsMap = new Map<string, Pair>()

  for (const asset of assets) {
    const segs = (asset.departmentFullAddress ?? '')
      .split('>')
      .map((s) => s.trim())
      .filter(Boolean)

    let bloco: string
    let ambiente: string

    if (segs.length >= 5) {
      bloco = segs[3]
      ambiente = segs[4]
    } else if (segs.length === 4) {
      bloco = blocoFallback
      ambiente = segs[3]
    } else {
      continue
    }

    if (!bloco || !ambiente) continue
    const key = `${bloco}|${ambiente}`
    if (!pairsMap.has(key)) {
      const tipo: 'gases' | 'ocorrencia' = isGasTipo(bloco) || isGasTipo(ambiente) ? 'gases' : 'ocorrencia'
      pairsMap.set(key, { bloco, ambiente, tipo })
    }
  }

  // Agrupar pares por bloco
  const blocoMap = new Map<string, Pair[]>()
  for (const pair of pairsMap.values()) {
    const list = blocoMap.get(pair.bloco) ?? []
    list.push(pair)
    blocoMap.set(pair.bloco, list)
  }

  // Nomes de blocos que vieram da API (para deletar os que sumiram)
  const nomesBlocksApi = new Set([...blocoMap.keys()].map((n) => n.toUpperCase()))

  // Buscar estado atual do banco
  const blocosExistentes = await prisma.blocoTenant.findMany({
    where: { tenantId },
    select: { id: true, nome: true },
  })
  const blocoNomeToId = new Map(blocosExistentes.map((b) => [b.nome.toUpperCase(), b.id]))

  const ambientesExistentes = await prisma.ambienteTenant.findMany({
    where: { tenantId },
    select: { id: true, nome: true, blocoId: true },
  })

  let blocosCriados = 0
  let ambientesCriados = 0
  let ambientesRemovidos = 0
  let blocosRemovidos = 0
  let blocoOrdem = 0

  // ── 1. Upsert: criar blocos e ambientes que vieram da API ──
  for (const [blocoNome, pairs] of blocoMap.entries()) {
    let blocoId = blocoNomeToId.get(blocoNome.toUpperCase())
    if (!blocoId) {
      const novo = await prisma.blocoTenant.create({
        data: { tenantId, nome: blocoNome, ordem: blocoOrdem },
        select: { id: true },
      })
      blocoId = novo.id
      blocoNomeToId.set(blocoNome.toUpperCase(), blocoId)
      blocosCriados++
    }
    blocoOrdem++

    const ambientesDoBloco = ambientesExistentes.filter((a) => a.blocoId === blocoId)
    const nomesAmbientesApi = new Set(pairs.map((p) => p.ambiente.toUpperCase()))

    // Criar ambientes novos
    const nomesExistentes = new Set(ambientesDoBloco.map((a) => a.nome.toUpperCase()))
    let ambienteOrdem = ambientesDoBloco.length
    for (const pair of pairs) {
      if (nomesExistentes.has(pair.ambiente.toUpperCase())) continue
      await prisma.ambienteTenant.create({
        data: { tenantId, blocoId, nome: pair.ambiente, tipo: pair.tipo, ordem: ambienteOrdem++ },
      })
      ambientesCriados++
    }

    // Deletar ambientes que sumiram da API neste bloco
    const ambientesParaDeletar = ambientesDoBloco.filter(
      (a) => !nomesAmbientesApi.has(a.nome.toUpperCase()),
    )
    if (ambientesParaDeletar.length > 0) {
      await prisma.ambienteTenant.deleteMany({
        where: { id: { in: ambientesParaDeletar.map((a) => a.id) } },
      })
      ambientesRemovidos += ambientesParaDeletar.length
    }
  }

  // ── 2. Deletar blocos que sumiram da API (e seus ambientes órfãos) ──
  const blocosParaDeletar = blocosExistentes.filter(
    (b) => !nomesBlocksApi.has(b.nome.toUpperCase()),
  )
  for (const bloco of blocosParaDeletar) {
    // Deletar ambientes do bloco antes (FK constraint)
    const orfaos = ambientesExistentes.filter((a) => a.blocoId === bloco.id)
    if (orfaos.length > 0) {
      await prisma.ambienteTenant.deleteMany({ where: { id: { in: orfaos.map((a) => a.id) } } })
      ambientesRemovidos += orfaos.length
    }
    await prisma.blocoTenant.delete({ where: { id: bloco.id } })
    blocosRemovidos++
  }

  return { blocosCriados, ambientesCriados, ambientesRemovidos, blocosRemovidos }
}
