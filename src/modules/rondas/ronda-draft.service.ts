import { prisma } from '@/lib/db'
import { expirarRondasAbertas } from '@/modules/rondas/rondas.service'

export async function buscarDraft(tenantId: string, userId: string) {
  try {
    // Fecha rondas abertas há mais de 24h antes de devolver o draft, para não
    // oferecer "continuar ronda" de uma ronda já expirada
    await expirarRondasAbertas().catch(() => {})

    const draft = await prisma.rondaDraft.findUnique({
      where: { tenantId_criadoPorId: { tenantId, criadoPorId: userId } },
    })
    if (!draft) return null

    const estado = draft.estado as { rondaId?: string } | null
    if (estado?.rondaId) {
      const ronda = await prisma.rondaOcorrencia.findUnique({
        where: { id: estado.rondaId },
        select: { finalizadoEm: true },
      })
      if (!ronda || ronda.finalizadoEm !== null) {
        await prisma.rondaDraft.deleteMany({ where: { tenantId, criadoPorId: userId } })
        return null
      }
    }

    return draft
  } catch (error) {
    console.error('[ronda-draft.service] buscarDraft:', error)
    throw error
  }
}

export async function salvarDraft(tenantId: string, userId: string, estado: unknown) {
  try {
    const estadoJson = estado as Parameters<typeof prisma.rondaDraft.upsert>[0]['create']['estado']
    return await prisma.rondaDraft.upsert({
      where: { tenantId_criadoPorId: { tenantId, criadoPorId: userId } },
      update: { estado: estadoJson },
      create: { tenantId, criadoPorId: userId, estado: estadoJson },
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
