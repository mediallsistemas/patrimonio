import { prisma } from '@/lib/db'

export async function buscarFotoOcorrencia(id: string): Promise<string | null> {
  try {
    const ocorrencia = await prisma.ocorrenciaDetalhe.findUnique({
      where: { id },
      select: { foto: true },
    })
    return ocorrencia?.foto ?? null
  } catch (error) {
    console.error('[ocorrencias.service] buscarFotoOcorrencia:', error)
    throw error
  }
}
