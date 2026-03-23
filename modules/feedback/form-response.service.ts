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
