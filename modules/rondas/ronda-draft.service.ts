import { prisma } from '@/lib/db'

export async function buscarDraft(tenantId: string, userId: string) {
  return prisma.rondaDraft.findUnique({
    where: { tenantId_criadoPorId: { tenantId, criadoPorId: userId } },
  })
}

export async function salvarDraft(tenantId: string, userId: string, estado: unknown) {
  return prisma.rondaDraft.upsert({
    where: { tenantId_criadoPorId: { tenantId, criadoPorId: userId } },
    update: { estado: estado as never },
    create: { tenantId, criadoPorId: userId, estado: estado as never },
  })
}

export async function descartarDraft(tenantId: string, userId: string): Promise<void> {
  await prisma.rondaDraft.deleteMany({
    where: { tenantId, criadoPorId: userId },
  })
}
