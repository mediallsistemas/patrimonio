import { prisma } from '@/lib/db'

// Usado em operações de detalhe (buscar, criar, finalizar uma ronda)
const INCLUDE_AMBIENTES = {
  ambientes: {
    orderBy: { concluidoEm: 'asc' as const },
    include: {
      ocorrencia: {
        select: { id: true, tipo: true, descricao: true, foto: true, trilogoChamado: true },
      },
    },
  },
}

// Usado em listagens — evita carregar todos os ambientes e ocorrências aninhadas
const SELECT_RONDA_LIGHT = {
  id: true,
  iniciadoEm: true,
  finalizadoEm: true,
  tenantId: true,
  criadoPorId: true,
  _count: { select: { ambientes: true } },
} as const

export async function listarRondas(tenantId: string | null, limit = 50) {
  try {
    const where = tenantId ? { tenantId } : {}
    return await prisma.rondaOcorrencia.findMany({
      where,
      orderBy: { iniciadoEm: 'desc' },
      take: limit,
      select: SELECT_RONDA_LIGHT,
    })
  } catch (error) {
    console.error('[rondas.service] listarRondas:', error)
    throw error
  }
}

export async function buscarRonda(id: string, tenantId: string | null) {
  try {
    const where = tenantId ? { id, tenantId } : { id }
    return await prisma.rondaOcorrencia.findFirst({
      where,
      include: INCLUDE_AMBIENTES,
    })
  } catch (error) {
    console.error('[rondas.service] buscarRonda:', error)
    throw error
  }
}

export async function criarRonda(tenantId: string, criadoPorId: string) {
  try {
    return await prisma.rondaOcorrencia.create({
      data: { tenantId, criadoPorId },
      include: INCLUDE_AMBIENTES,
    })
  } catch (error) {
    console.error('[rondas.service] criarRonda:', error)
    throw error
  }
}

export async function finalizarRonda(id: string, tenantId: string | null) {
  try {
    const where = tenantId ? { id, tenantId } : { id }
    const ronda = await prisma.rondaOcorrencia.findFirst({ where, select: { id: true } })
    if (!ronda) return null

    return await prisma.rondaOcorrencia.update({
      where: { id },
      data: { finalizadoEm: new Date() },
      include: INCLUDE_AMBIENTES,
    })
  } catch (error) {
    console.error('[rondas.service] finalizarRonda:', error)
    throw error
  }
}

export async function listarRondasAdmin(limit = 100) {
  try {
    const [rondas, tenants] = await Promise.all([
      prisma.rondaOcorrencia.findMany({
        orderBy: { iniciadoEm: 'desc' },
        take: limit,
        select: SELECT_RONDA_LIGHT,
      }),
      prisma.tenant.findMany({ select: { id: true, nome: true, slug: true } }),
    ])

    const tenantMap = Object.fromEntries(tenants.map((t) => [t.id, t]))

    return rondas.map((r) => ({
      ...r,
      tenant: tenantMap[r.tenantId] ?? { id: r.tenantId, nome: 'Desconhecido', slug: '' },
    }))
  } catch (error) {
    console.error('[rondas.service] listarRondasAdmin:', error)
    throw error
  }
}
