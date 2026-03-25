import { prisma } from '@/lib/db'

export async function buscarDraft(tenantId: string, userId: string) {
  try {
    return await prisma.rondaDraft.findUnique({
      where: { tenantId_criadoPorId: { tenantId, criadoPorId: userId } },
    })
  } catch (error) {
    console.error('[ronda-draft.service] buscarDraft:', error)
    throw error
  }
}

export async function salvarDraft(tenantId: string, userId: string, estado: unknown) {
  try {
    return await prisma.rondaDraft.upsert({
      where: { tenantId_criadoPorId: { tenantId, criadoPorId: userId } },
      update: { estado },
      create: { tenantId, criadoPorId: userId, estado },
    })
  } catch (error) {
    console.error('[ronda-draft.service] salvarDraft:', error)
    throw error
  }
}

export async function descartarDraft(tenantId: string, userId: string) {
  try {
    await prisma.rondaDraft.deleteMany({
      where: { tenantId, criadoPorId: userId },
    })
  } catch (error) {
    console.error('[ronda-draft.service] descartarDraft:', error)
    throw error
  }
}
