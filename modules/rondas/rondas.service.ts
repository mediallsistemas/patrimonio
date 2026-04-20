import { prisma } from '@/lib/db'
import type { z } from 'zod'
import type { RegistroAmbienteSchema } from './rondas.types'

type RegistroAmbienteInput = z.infer<typeof RegistroAmbienteSchema>

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
  criadoPorId: true,
  _count: { select: { ambientes: true } },
} as const

export async function listarRondas(tenantId: string | null, limit = 50, criadoPorId?: string) {
  try {
    const where = {
      ...(tenantId ? { tenantId } : {}),
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

export async function registrarAmbiente(rondaId: string, input: RegistroAmbienteInput) {
  try {
    return await prisma.registroAmbiente.create({
      data: {
        rondaId,
        ambiente: input.ambiente,
        temOcorrencia: input.temOcorrencia,
        concluidoEm: new Date(),
        ...(input.temOcorrencia && input.ocorrencia
          ? {
              ocorrencias: {
                create: {
                  tipo: input.ocorrencia.tipo,
                  descricao: input.ocorrencia.descricao,
                  foto: input.ocorrencia.foto ?? null,
                  trilogoChamado: input.ocorrencia.trilogoChamado,
                },
              },
            }
          : {}),
      },
      include: {
        ocorrencias: {
          select: { id: true, tipo: true, descricao: true, foto: true, trilogoChamado: true },
        },
      },
    })
  } catch (error) {
    console.error('[rondas.service] registrarAmbiente:', error)
    throw error
  }
}

export async function listarRondasAdmin(limit = 100) {
  try {
    const [rondas, tenants] = await Promise.all([
      prisma.rondaOcorrencia.findMany({
        orderBy: { iniciadoEm: 'desc' },
        take: limit,
        select: {
          ...SELECT_RONDA_LIGHT,
          ambientes: {
            select: {
              id: true,
              ambiente: true,
              temOcorrencia: true,
              concluidoEm: true,
              tipoRegistro: true,
              ocorrencias: {
                select: {
                  id: true,
                  tipo: true,
                  descricao: true,
                  foto: true,
                  trilogoChamado: true,
                },
              },
            },
          },
        },
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
