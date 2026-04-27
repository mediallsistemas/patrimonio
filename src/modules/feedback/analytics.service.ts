import { prisma } from '@/lib/db'
import type {
  AnalyticsSummary,
  AnalyticsByPeriod,
  AnalyticsByDepartment,
  RespostaCampo,
} from './feedback.types'

// Identifica se um campo é a pergunta de recomendação (compatível com "nps" legado e "recomendaria")
function ehCampoRecomendaria(pergunta: string): boolean {
  const p = pergunta?.toLowerCase() ?? ''
  return p === 'recomendaria' || p === 'nps' || p.includes('recomend')
}

function calcularMediaRecomendaria(respostasJson: unknown[]): number | null {
  const notas: number[] = []
  for (const respostaRaw of respostasJson) {
    const campos = respostaRaw as RespostaCampo[]
    if (!Array.isArray(campos)) continue
    for (const campo of campos) {
      if (ehCampoRecomendaria(campo.pergunta) && typeof campo.nota === 'number') {
        notas.push(campo.nota)
      }
    }
  }
  if (notas.length === 0) return null
  return parseFloat((notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(2))
}

function calcularMediaGeral(respostasJson: unknown[]): number | null {
  const notas: number[] = []
  for (const respostaRaw of respostasJson) {
    const campos = respostaRaw as RespostaCampo[]
    if (!Array.isArray(campos)) continue
    for (const campo of campos) {
      if (typeof campo.nota === 'number') notas.push(campo.nota)
    }
  }
  if (notas.length === 0) return null
  return parseFloat((notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(2))
}

export async function getSummary(
  tenantId: string,
  filtros: { de?: string; ate?: string; setor?: string } = {}
): Promise<AnalyticsSummary> {
  const where = {
    tenantId,
    deletadoEm: null as null,
    ...(filtros.setor && { setor: filtros.setor }),
    ...(filtros.de || filtros.ate
      ? {
          criadoEm: {
            ...(filtros.de && { gte: new Date(filtros.de) }),
            ...(filtros.ate && { lte: new Date(filtros.ate) }),
          },
        }
      : {}),
  }

  const respostas = await prisma.respostaFormulario.findMany({
    where,
    select: { setor: true, respostas: true },
  })

  const totalRespostas = respostas.length
  const todasRespostas = respostas.map((r) => r.respostas)
  const mediaRecomendaria = calcularMediaRecomendaria(todasRespostas)
  const mediaGeral = calcularMediaGeral(todasRespostas)

  // pctRecomendaria: % que respondeu >= 1 na pergunta de recomendação (0=Não, 1=Sim na SPA)
  let recTotal = 0, recSim = 0
  for (const r of respostas) {
    const campos = r.respostas as unknown as RespostaCampo[]
    if (!Array.isArray(campos)) continue
    const campo = campos.find((c) => ehCampoRecomendaria(c.pergunta))
    if (campo && typeof campo.nota === 'number') {
      recTotal++
      if (campo.nota >= 1) recSim++
    }
  }
  const pctRecomendaria = recTotal > 0 ? parseFloat(((recSim / recTotal) * 100).toFixed(1)) : 0

  // agrupar por setor
  const setorMap = new Map<string, number>()
  for (const r of respostas) {
    const s = r.setor ?? 'Sem setor'
    setorMap.set(s, (setorMap.get(s) ?? 0) + 1)
  }
  const porSetor = Array.from(setorMap.entries()).map(([setor, total]) => ({ setor, total }))

  return { totalRespostas, mediaRecomendaria, mediaGeral, pctRecomendaria, porSetor }
}

export async function getByPeriod(
  tenantId: string,
  filtros: { de?: string; ate?: string; agrupamento?: 'dia' | 'semana' | 'mes' } = {}
): Promise<AnalyticsByPeriod[]> {
  const respostas = await prisma.respostaFormulario.findMany({
    where: {
      tenantId,
      deletadoEm: null,
      ...(filtros.de || filtros.ate
        ? {
            criadoEm: {
              ...(filtros.de && { gte: new Date(filtros.de) }),
              ...(filtros.ate && { lte: new Date(filtros.ate) }),
            },
          }
        : {}),
    },
    select: { criadoEm: true, respostas: true },
    orderBy: { criadoEm: 'asc' },
  })

  const agrupamento = filtros.agrupamento ?? 'mes'

  const periodoMap = new Map<string, unknown[][]>()
  for (const r of respostas) {
    let key: string
    const d = r.criadoEm
    if (agrupamento === 'dia') {
      key = d.toISOString().slice(0, 10)
    } else if (agrupamento === 'semana') {
      const startOfWeek = new Date(d)
      startOfWeek.setDate(d.getDate() - d.getDay())
      key = startOfWeek.toISOString().slice(0, 10)
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    if (!periodoMap.has(key)) periodoMap.set(key, [])
    periodoMap.get(key)!.push(r.respostas as unknown[])
  }

  return Array.from(periodoMap.entries()).map(([periodo, rs]) => ({
    periodo,
    total: rs.length,
    mediaRecomendaria: calcularMediaRecomendaria(rs),
  }))
}

export async function getByDepartment(
  tenantId: string,
  filtros: { de?: string; ate?: string } = {}
): Promise<AnalyticsByDepartment[]> {
  const respostas = await prisma.respostaFormulario.findMany({
    where: {
      tenantId,
      deletadoEm: null,
      ...(filtros.de || filtros.ate
        ? {
            criadoEm: {
              ...(filtros.de && { gte: new Date(filtros.de) }),
              ...(filtros.ate && { lte: new Date(filtros.ate) }),
            },
          }
        : {}),
    },
    select: { setor: true, respostas: true },
  })

  const setorMap = new Map<string, unknown[][]>()
  for (const r of respostas) {
    const s = r.setor ?? 'Sem setor'
    if (!setorMap.has(s)) setorMap.set(s, [])
    setorMap.get(s)!.push(r.respostas as unknown[])
  }

  return Array.from(setorMap.entries()).map(([setor, rs]) => ({
    setor,
    total: rs.length,
    mediaRecomendaria: calcularMediaRecomendaria(rs),
  }))
}
