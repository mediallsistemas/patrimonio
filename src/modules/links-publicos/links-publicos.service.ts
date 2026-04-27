import { prisma } from '@/lib/db'

export interface CriarLinkAmbienteInput {
  companyId: number
  projeto: string
  ambiente: string
  tenantId: string
}

export async function criarOuBuscarLinkAmbiente(input: CriarLinkAmbienteInput): Promise<string> {
  try {
    const existente = await prisma.linkPublicoBem.findUnique({
      where: { companyId_projeto_ambiente: { companyId: input.companyId, projeto: input.projeto, ambiente: input.ambiente } },
      select: { id: true },
    })
    if (existente) return existente.id

    const novo = await prisma.linkPublicoBem.create({
      data: { companyId: input.companyId, projeto: input.projeto, ambiente: input.ambiente, tenantId: input.tenantId },
      select: { id: true },
    })
    return novo.id
  } catch (error) {
    console.error('[links-publicos.service] criarOuBuscarLinkAmbiente:', error)
    throw error
  }
}

export async function buscarLinkAmbiente(id: string) {
  try {
    return await prisma.linkPublicoBem.findUnique({
      where: { id },
      select: { id: true, companyId: true, projeto: true, ambiente: true },
    })
  } catch (error) {
    console.error('[links-publicos.service] buscarLinkAmbiente:', error)
    throw error
  }
}

export async function listarAgendamentosPorAssets(trilogoAssetIds: number[]) {
  try {
    if (trilogoAssetIds.length === 0) return []
    return await prisma.agendamentoManutencao.findMany({
      where: { trilogoAssetId: { in: trilogoAssetIds }, status: { not: 'cancelado' } },
      orderBy: { dataAgendada: 'asc' },
      select: {
        id: true,
        trilogoAssetId: true,
        titulo: true,
        dataAgendada: true,
        dataRealizada: true,
        observacao: true,
        status: true,
        ambiente: true,
      },
    })
  } catch (error) {
    console.error('[links-publicos.service] listarAgendamentosPorAssets:', error)
    throw error
  }
}
