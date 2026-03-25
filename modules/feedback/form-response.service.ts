import { prisma } from '@/lib/db'
import type { CreateRespostaDto, FiltrosRespostaDto } from './feedback.types'

export async function submeterResposta(
  tenantId: string,
  data: CreateRespostaDto,
  criadoPorId?: string
) {
  return prisma.respostaFormulario.create({
    data: {
      tenantId,
      templateId:    data.templateId ?? null,
      nomePaciente:  data.nomePaciente ?? null,
      cpf:           data.cpf ?? null,
      idade:         data.idade ?? null,
      genero:        data.genero ?? null,
      dataInternacao: data.dataInternacao ? new Date(data.dataInternacao) : null,
      dataAlta:       data.dataAlta ? new Date(data.dataAlta) : null,
      setor:         data.setor ?? null,
      respostas:     data.respostas as unknown as import('@prisma/client').Prisma.InputJsonValue,
      comentarios:   data.comentarios ?? null,
      criadoPorId:   criadoPorId ?? null,
    },
  })
}

export async function listarRespostas(tenantId: string, filtros: FiltrosRespostaDto = {}) {
  return prisma.respostaFormulario.findMany({
    where: {
      tenantId,
      deletadoEm: null,
      ...(filtros.setor && { setor: filtros.setor }),
      ...(filtros.templateId && { templateId: filtros.templateId }),
      ...(filtros.de || filtros.ate
        ? {
            criadoEm: {
              ...(filtros.de && { gte: new Date(filtros.de) }),
              ...(filtros.ate && { lte: new Date(filtros.ate) }),
            },
          }
        : {}),
    },
    orderBy: { criadoEm: 'desc' },
    include: { template: { select: { nome: true } } },
  })
}

export async function buscarResposta(id: string, tenantId: string | null) {
  return prisma.respostaFormulario.findFirst({
    where: { id, ...(tenantId ? { tenantId } : {}), deletadoEm: null },
    include: { template: true },
  })
}

export async function softDeletarResposta(id: string, tenantId: string | null) {
  return prisma.respostaFormulario.updateMany({
    where: { id, ...(tenantId ? { tenantId } : {}), deletadoEm: null },
    data: { deletadoEm: new Date() },
  })
}

export interface FiltrosMetricasDto {
  startDate?: string | null
  endDate?: string | null
  formType?: string | null
}

export async function buscarMetricas(tenantId: string, filtros: FiltrosMetricasDto = {}) {
  try {
    const where = {
      tenantId,
      deletadoEm: null as null,
      ...(filtros.formType && { setor: filtros.formType }),
      ...(filtros.startDate || filtros.endDate
        ? {
            criadoEm: {
              ...(filtros.startDate && { gte: new Date(filtros.startDate) }),
              ...(filtros.endDate && { lte: new Date(filtros.endDate) }),
            },
          }
        : {}),
    }

    const respostas = await prisma.respostaFormulario.findMany({
      where,
      select: { respostas: true, criadoEm: true },
    })

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    let totalNota = 0
    let countNotas = 0
    let totalNps = 0
    let countNps = 0
    let responsesThisMonth = 0
    let responsesLastMonth = 0

    for (const r of respostas) {
      const campos = r.respostas as Array<{ pergunta: string; nota?: number }>
      if (Array.isArray(campos)) {
        for (const c of campos) {
          if (typeof c.nota === 'number') {
            const p = c.pergunta?.toLowerCase() ?? ''
            if (p === 'recomendaria' || p === 'nps' || p.includes('recomend')) {
              totalNps += c.nota
              countNps++
            } else {
              totalNota += c.nota
              countNotas++
            }
          }
        }
      }

      if (r.criadoEm >= thisMonthStart) responsesThisMonth++
      else if (r.criadoEm >= lastMonthStart) responsesLastMonth++
    }

    return {
      totalResponses: respostas.length,
      averageSatisfaction: countNotas > 0 ? parseFloat((totalNota / countNotas).toFixed(2)) : 0,
      averageNps: countNps > 0 ? parseFloat((totalNps / countNps).toFixed(2)) : 0,
      averageRecomendaria: countNps > 0 ? parseFloat((totalNps / countNps).toFixed(2)) : 0,
      responsesThisMonth,
      responsesLastMonth,
    }
  } catch (error) {
    console.error('[form-response.service] buscarMetricas:', error)
    throw error
  }
}
