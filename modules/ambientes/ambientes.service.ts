import { prisma } from '@/lib/db'
import type { CreateAmbienteInput } from './ambientes.types'

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
// Extrai blocos (seg[3]) e ambientes (seg[4]) dos assets do Trilogo e popula
// a hierarquia BlocoTenant → AmbienteTenant para o tenant informado.
// Assets com 4 segmentos (sem bloco explícito) são agrupados num bloco "Geral".
// Assets com 5+ segmentos: seg[3]=bloco, seg[4]=ambiente.
// Opera em modo "upsert": cria o que não existe, não deleta existentes.
// Retorna { blocos, ambientes } com contagem do que foi criado.

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
): Promise<{ blocosCriados: number; ambientesCriados: number }> {
  // Extrai pares únicos (bloco, ambiente) do Trilogo
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
      // Estrutura completa: EMPRESA > CIDADE > PROJETO > BLOCO > AMBIENTE
      bloco = segs[3]
      ambiente = segs[4]
    } else if (segs.length === 4) {
      // Sem bloco explícito: EMPRESA > CIDADE > PROJETO > AMBIENTE
      bloco = blocoFallback
      ambiente = segs[3]
    } else {
      continue
    }

    if (!bloco || !ambiente) continue
    const key = `${bloco}|${ambiente}`
    if (!pairsMap.has(key)) {
      const tipo: 'gases' | 'ocorrencia' = isGasTipo(bloco) || isGasTipo(ambiente)
        ? 'gases'
        : 'ocorrencia'
      pairsMap.set(key, { bloco, ambiente, tipo })
    }
  }

  if (pairsMap.size === 0) return { blocosCriados: 0, ambientesCriados: 0 }

  // Agrupar por bloco
  const blocoMap = new Map<string, Pair[]>()
  for (const pair of pairsMap.values()) {
    const list = blocoMap.get(pair.bloco) ?? []
    list.push(pair)
    blocoMap.set(pair.bloco, list)
  }

  // Buscar blocos já existentes para o tenant
  const blocosExistentes = await prisma.blocoTenant.findMany({
    where: { tenantId },
    select: { id: true, nome: true },
  })
  const blocoNomeToId = new Map(blocosExistentes.map((b) => [b.nome.toUpperCase(), b.id]))

  // Buscar ambientes já existentes para o tenant
  const ambientesExistentes = await prisma.ambienteTenant.findMany({
    where: { tenantId },
    select: { nome: true, blocoId: true },
  })
  const ambienteKeys = new Set(
    ambientesExistentes.map((a) => `${a.blocoId ?? ''}|${a.nome.toUpperCase()}`),
  )

  let blocosCriados = 0
  let ambientesCriados = 0
  let blocoOrdem = blocosExistentes.length

  for (const [blocoNome, pairs] of blocoMap.entries()) {
    // Upsert bloco
    let blocoId = blocoNomeToId.get(blocoNome.toUpperCase())
    if (!blocoId) {
      const novo = await prisma.blocoTenant.create({
        data: { tenantId, nome: blocoNome, ordem: blocoOrdem++ },
        select: { id: true },
      })
      blocoId = novo.id
      blocoNomeToId.set(blocoNome.toUpperCase(), blocoId)
      blocosCriados++
    }

    // Upsert ambientes do bloco
    let ambienteOrdem = ambientesExistentes.filter((a) => a.blocoId === blocoId).length
    for (const pair of pairs) {
      const key = `${blocoId}|${pair.ambiente.toUpperCase()}`
      if (ambienteKeys.has(key)) continue
      await prisma.ambienteTenant.create({
        data: {
          tenantId,
          blocoId,
          nome: pair.ambiente,
          tipo: pair.tipo,
          ordem: ambienteOrdem++,
        },
      })
      ambienteKeys.add(key)
      ambientesCriados++
    }
  }

  return { blocosCriados, ambientesCriados }
}
