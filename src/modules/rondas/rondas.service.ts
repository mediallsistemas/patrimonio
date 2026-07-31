import { prisma } from '@/lib/db'
import { tenantFilter } from '@/modules/auth/tenant-filter'
import type { RegistroAmbienteInput } from './rondas.types'

// Usado em operações de detalhe (buscar, criar, finalizar uma ronda)
const INCLUDE_AMBIENTES = {
  ambientes: {
    orderBy: { concluidoEm: 'asc' as const },
    include: {
      ocorrencias: {
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
  criadoPor: { select: { id: true, nome: true } },
  ambientes: {
    orderBy: { concluidoEm: 'asc' as const },
    select: {
      id: true,
      ambiente: true,
      temOcorrencia: true,
      concluidoEm: true,
      ocorrencias: {
        select: { id: true, tipo: true, descricao: true, trilogoChamado: true, bemPatrimony: true, bemDescricao: true },
      },
    },
  },
} as const

export async function listarRondas(tenantId: string | null, limit = 50, criadoPorId?: string, tenantIds?: string[]) {
  try {
    const where = {
      ...tenantFilter({ tenantId, tenantIds }),
      ...(criadoPorId ? { criadoPorId } : {}),
    }
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

export async function buscarRonda(id: string, tenantId: string | null, tenantIds?: string[]) {
  try {
    const where = { id, ...tenantFilter({ tenantId, tenantIds }) }
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
    // Fecha rondas abertas há mais de 24h antes de checar conflito, evitando
    // bloquear o início de uma nova ronda por uma anterior já expirada
    await expirarRondasAbertas().catch(() => {})

    const emAndamento = await prisma.rondaOcorrencia.findFirst({
      where: { criadoPorId, tenantId, finalizadoEm: null },
      select: { id: true },
    })
    if (emAndamento) {
      return { conflict: true, rondaId: emAndamento.id } as const
    }

    return await prisma.rondaOcorrencia.create({
      data: { tenantId, criadoPorId },
      include: INCLUDE_AMBIENTES,
    })
  } catch (error) {
    console.error('[rondas.service] criarRonda:', error)
    throw error
  }
}

export async function finalizarRonda(id: string, tenantId: string | null, tenantIds?: string[]) {
  try {
    const where = { id, ...tenantFilter({ tenantId, tenantIds }) }
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

export async function registrarAmbiente(rondaId: string, input: RegistroAmbienteInput) {
  try {
    const gasesData =
      input.tipoRegistro === 'gases'
        ? {
            purezaO2: input.purezaO2,
            pressaoO2: input.pressaoO2,
            pressaoAr: input.pressaoAr,
            backupLigado: input.backupLigado,
            temAbastecimento: input.temAbastecimento,
            qtdCilindros: input.qtdCilindros ?? null,
            tamCilindro: input.tamCilindro ?? null,
          }
        : {}

    const registro = await prisma.registroAmbiente.create({
      data: {
        rondaId,
        ambiente: input.ambiente,
        tipoRegistro: input.tipoRegistro,
        temOcorrencia: input.temOcorrencia,
        ...gasesData,
        ...(input.temOcorrencia && input.ocorrencias?.length
          ? {
              ocorrencias: {
                createMany: {
                  data: input.ocorrencias.map((o) => ({
                    tipo: o.tipo,
                    descricao: o.descricao,
                    foto: o.foto ?? null,
                    trilogoChamado: o.trilogoChamado,
                    bemPatrimony: o.bemPatrimony ?? null,
                    bemDescricao: o.bemDescricao ?? null,
                  })),
                },
              },
            }
          : {}),
      },
      include: {
        ocorrencias: {
          select: { id: true, tipo: true, descricao: true, trilogoChamado: true },
        },
      },
    })

    // Mantém atualizadoEm da ronda fresco para evitar expiração durante ronda ativa
    await prisma.$executeRaw`UPDATE rondas_ocorrencias SET "atualizadoEm" = NOW() WHERE id = ${rondaId}`

    return registro
  } catch (error) {
    console.error('[rondas.service] registrarAmbiente:', error)
    throw error
  }
}

const EXPIRACAO_RONDA_MS = 24 * 60 * 60 * 1000

export async function expirarRondasAbertas(): Promise<{ expiradas: number }> {
  try {
    const limite = new Date(Date.now() - EXPIRACAO_RONDA_MS)
    const result = await prisma.$executeRaw`
      UPDATE rondas_ocorrencias
      SET "finalizadoEm" = NOW()
      WHERE "finalizadoEm" IS NULL
        AND "atualizadoEm" < ${limite}
    `
    return { expiradas: result }
  } catch (error) {
    console.error('[rondas.service] expirarRondasAbertas:', error)
    throw error
  }
}

export async function listarRondasAdmin(limit = 100, tenantId?: string, tenantIds?: string[]) {
  try {
    // > 0 (e não > 1): com 1 id o `in` equivale à igualdade — antes o caso de
    // exatamente 1 tenantId caía no fallback e, sem tenantId, abria o filtro.
    const where = tenantIds && tenantIds.length > 0
      ? { tenantId: { in: tenantIds } }
      : tenantId ? { tenantId } : undefined
    return await prisma.rondaOcorrencia.findMany({
      where,
      orderBy: { iniciadoEm: 'desc' },
      take: limit,
      select: {
        id: true,
        iniciadoEm: true,
        finalizadoEm: true,
        tenantId: true,
        criadoPor: { select: { id: true, nome: true } },
        tenant: { select: { id: true, nome: true, slug: true } },
        ambientes: {
          orderBy: { concluidoEm: 'asc' as const },
          select: {
            id: true,
            ambiente: true,
            temOcorrencia: true,
            concluidoEm: true,
            ocorrencias: {
              select: { id: true, tipo: true, descricao: true, foto: true, trilogoChamado: true, bemPatrimony: true, bemDescricao: true },
            },
          },
        },
      },
    })
  } catch (error) {
    console.error('[rondas.service] listarRondasAdmin:', error)
    throw error
  }
}
