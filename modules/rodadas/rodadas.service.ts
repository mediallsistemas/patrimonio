import { prisma } from '@/lib/db'

const INCLUDE_AMBIENTES = {
  ambientes: {
    orderBy: { concluidoEm: 'asc' as const },
    include: {
      abastecimento: { select: { quantidade: true, tamanho: true } },
      alteracao: {
        select: { id: true, tipo: true, descricao: true, trilogoChamado: true },
      },
    },
  },
}

export async function listarRodadas(tenantId: string | null, limit = 50) {
  try {
    const where = tenantId ? { tenantId } : {}
    return await prisma.rodada.findMany({
      where,
      orderBy: { iniciadoEm: 'desc' },
      take: limit,
      include: INCLUDE_AMBIENTES,
    })
  } catch (error) {
    console.error('[rodadas.service] listarRodadas:', error)
    throw error
  }
}

export async function criarRodada(tenantId: string, criadoPorId: string) {
  try {
    return await prisma.rodada.create({
      data: { tenantId, criadoPorId },
    })
  } catch (error) {
    console.error('[rodadas.service] criarRodada:', error)
    throw error
  }
}

export async function finalizarRodada(id: string) {
  try {
    return await prisma.rodada.update({
      where: { id },
      data: { finalizadoEm: new Date() },
    })
  } catch (error) {
    console.error('[rodadas.service] finalizarRodada:', error)
    throw error
  }
}

export interface RegistrarAmbienteInput {
  ambiente: string
  purezaO2: number
  pressaoO2: number
  pressaoAr: number
  backupLigado: boolean
  temAbastecimento: boolean
  temAlteracao: boolean
  abastecimento?: { quantidade: number; tamanho: string } | null
  alteracao?: { tipo: string; descricao: string; foto?: string | null; trilogoChamado: boolean } | null
}

export async function registrarAmbienteRodada(rodadaId: string, input: RegistrarAmbienteInput) {
  try {
    return await prisma.ambienteInspecionado.create({
      data: {
        rodadaId,
        ambiente: input.ambiente,
        purezaO2: input.purezaO2,
        pressaoO2: input.pressaoO2,
        pressaoAr: input.pressaoAr,
        backupLigado: input.backupLigado,
        temAbastecimento: input.temAbastecimento,
        temAlteracao: input.temAlteracao,
        ...(input.temAbastecimento && input.abastecimento
          ? {
              abastecimento: {
                create: {
                  quantidade: input.abastecimento.quantidade,
                  tamanho: input.abastecimento.tamanho,
                },
              },
            }
          : {}),
        ...(input.temAlteracao && input.alteracao
          ? {
              alteracao: {
                create: {
                  tipo: input.alteracao.tipo,
                  descricao: input.alteracao.descricao,
                  foto: input.alteracao.foto ?? null,
                  trilogoChamado: input.alteracao.trilogoChamado,
                },
              },
            }
          : {}),
      },
      include: {
        abastecimento: true,
        alteracao: {
          select: { id: true, tipo: true, descricao: true, trilogoChamado: true },
        },
      },
    })
  } catch (error) {
    console.error('[rodadas.service] registrarAmbienteRodada:', error)
    throw error
  }
}

export async function buscarFotoAlteracao(ambienteInspecionadoId: string): Promise<string | null> {
  try {
    const alteracao = await prisma.alteracao.findUnique({
      where: { ambienteInspecionadoId },
      select: { foto: true },
    })
    return alteracao?.foto ?? null
  } catch (error) {
    console.error('[rodadas.service] buscarFotoAlteracao:', error)
    throw error
  }
}
