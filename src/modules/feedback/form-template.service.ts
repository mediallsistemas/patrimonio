import { prisma } from '@/lib/db'
import type { CreateTemplateDto, UpdateTemplateDto } from './feedback.types'

export async function listarTemplates(tenantId: string) {
  return prisma.templateFormulario.findMany({
    where: { tenantId },
    orderBy: { criadoEm: 'desc' },
  })
}

export async function buscarTemplate(id: string, tenantId: string) {
  return prisma.templateFormulario.findFirst({
    where: { id, tenantId },
  })
}

export async function criarTemplate(tenantId: string, data: CreateTemplateDto) {
  return prisma.templateFormulario.create({
    data: {
      tenantId,
      nome: data.nome,
      campos: data.campos as unknown as import('@prisma/client').Prisma.InputJsonValue,
      ativo: data.ativo ?? true,
    },
  })
}

export async function atualizarTemplate(
  id: string,
  tenantId: string,
  data: UpdateTemplateDto
) {
  return prisma.templateFormulario.updateMany({
    where: { id, tenantId },
    data: {
      ...(data.nome !== undefined && { nome: data.nome }),
      ...(data.campos !== undefined && { campos: data.campos as unknown as import('@prisma/client').Prisma.InputJsonValue }),
      ...(data.ativo !== undefined && { ativo: data.ativo }),
    },
  })
}

export async function deletarTemplate(id: string, tenantId: string) {
  return prisma.templateFormulario.deleteMany({
    where: { id, tenantId },
  })
}
