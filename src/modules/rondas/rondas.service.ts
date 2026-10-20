import { prisma } from '@/lib/db'
import { filtroEscopo, tenantFilter, type EscopoLeitura } from '@/modules/auth/tenant-filter'
import { cilindrosParaGravar, fotosMedicoesParaGravar, resumoCilindros } from './rondas.rules'
import type { MedicaoGas, RegistroAmbienteInput } from './rondas.types'

// Medições de gases nas listagens: os valores, o abastecimento e QUAIS
// medições têm foto do relógio — a foto em si vem sob demanda
// (buscarFotoMedicao), nunca na lista. qtdCilindros/tamCilindro cobrem os
// registros anteriores à tabela cilindros_abastecidos.
const SELECT_GASES_LISTA = {
  tipoRegistro: true,
  purezaO2: true,
  pressaoO2: true,
  pressaoAr: true,
  temAbastecimento: true,
  qtdCilindros: true,
  tamCilindro: true,
  cilindros: { select: { tamanho: true, quantidade: true } },
  fotosMedicoes: { select: { medicao: true } },
} as const

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
  criadoPor: { select: { id: true, nome: true } },
  ambientes: {
    orderBy: { concluidoEm: 'asc' as const },
    select: {
      id: true,
      ambiente: true,
      temOcorrencia: true,
      concluidoEm: true,
      ...SELECT_GASES_LISTA,
      ocorrencias: {
        select: { id: true, tipo: true, descricao: true, trilogoChamado: true, bemPatrimony: true, bemDescricao: true },
      },
    },
  },
} as const

export async function listarRondas(tenantId: string | null, limit = 50, criadoPorId?: string, tenantIds?: string[]) {
  try {
    const where = {
      ...tenantFilter({ tenantId, tenantIds }),
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

export async function buscarRonda(id: string, tenantId: string | null, tenantIds?: string[]) {
  try {
    const where = { id, ...tenantFilter({ tenantId, tenantIds }) }
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
    // Fecha rondas abertas há mais de 24h antes de criar
    await expirarRondasAbertas().catch(() => {})

    // Encerra rondas abertas do próprio usuário em vez de devolver 409: sem o
    // draft (descartado/perdido) a ronda antiga é inalcançável pela UI, e o
    // conflito prendia o usuário num loop "ronda expirou" sem saída
    const abertas = await prisma.rondaOcorrencia.findMany({
      where: { criadoPorId, tenantId, finalizadoEm: null },
      select: { id: true, _count: { select: { ambientes: true } } },
    })
    if (abertas.length > 0) {
      const vazias = abertas.filter((r) => r._count.ambientes === 0).map((r) => r.id)
      const comRegistros = abertas.filter((r) => r._count.ambientes > 0).map((r) => r.id)
      console.log(
        `[rondas.service] criarRonda: usuário ${criadoPorId} tinha ${abertas.length} ronda(s) aberta(s) — ` +
        `apagando ${vazias.length} vazia(s) e finalizando ${comRegistros.length} com registros`,
      )
      await prisma.$transaction([
        ...(vazias.length > 0
          ? [prisma.rondaOcorrencia.deleteMany({ where: { id: { in: vazias } } })]
          : []),
        ...(comRegistros.length > 0
          ? [prisma.rondaOcorrencia.updateMany({
              where: { id: { in: comRegistros } },
              data: { finalizadoEm: new Date() },
            })]
          : []),
      ])
    }

    return await prisma.rondaOcorrencia.create({
      data: { tenantId, criadoPorId },
      include: INCLUDE_AMBIENTES,
    })
  } catch (error) {
    console.error('[rondas.service] criarRonda:', error)
    throw error
  }
}

export async function finalizarRonda(id: string, tenantId: string | null, tenantIds?: string[]) {
  try {
    const where = { id, ...tenantFilter({ tenantId, tenantIds }) }
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
    const cilindros = cilindrosParaGravar(input)
    const gasesData =
      input.tipoRegistro === 'gases'
        ? {
            purezaO2: input.purezaO2,
            pressaoO2: input.pressaoO2,
            pressaoAr: input.pressaoAr,
            backupLigado: input.backupLigado,
            temAbastecimento: cilindros.length > 0,
            ...resumoCilindros(cilindros),
          }
        : {}

    const fotosMedicoes = fotosMedicoesParaGravar(input)

    const registro = await prisma.registroAmbiente.create({
      data: {
        rondaId,
        ambiente: input.ambiente,
        tipoRegistro: input.tipoRegistro,
        temOcorrencia: input.temOcorrencia,
        ...gasesData,
        ...(fotosMedicoes.length ? { fotosMedicoes: { createMany: { data: fotosMedicoes } } } : {}),
        ...(cilindros.length ? { cilindros: { createMany: { data: cilindros } } } : {}),
        ...(input.temOcorrencia && input.ocorrencias?.length
          ? {
              ocorrencias: {
                createMany: {
                  data: input.ocorrencias.map((o) => ({
                    tipo: o.tipo,
                    descricao: o.descricao,
                    foto: o.foto ?? null,
                    trilogoChamado: o.trilogoChamado,
                    bemPatrimony: o.bemPatrimony ?? null,
                    bemDescricao: o.bemDescricao ?? null,
                  })),
                },
              },
            }
          : {}),
      },
      include: {
        ocorrencias: {
          select: { id: true, tipo: true, descricao: true, trilogoChamado: true },
        },
      },
    })

    // Mantém atualizadoEm da ronda fresco para evitar expiração durante ronda ativa
    await prisma.$executeRaw`UPDATE rondas_ocorrencias SET "atualizadoEm" = NOW() WHERE id = ${rondaId}`

    return registro
  } catch (error) {
    console.error('[rondas.service] registrarAmbiente:', error)
    throw error
  }
}

/**
 * Foto do relógio de uma medição, só se a ronda do registro estiver no escopo
 * de leitura da sessão. null quando não há foto ou o registro é de outra unidade.
 */
export async function buscarFotoMedicao(
  registroId: string,
  medicao: MedicaoGas,
  escopo: EscopoLeitura,
): Promise<string | null> {
  try {
    const encontrada = await prisma.fotoMedicaoGas.findFirst({
      where: { registroId, medicao, registro: { ronda: filtroEscopo(escopo) } },
      select: { foto: true },
    })
    return encontrada?.foto ?? null
  } catch (error) {
    console.error('[rondas.service] buscarFotoMedicao:', error)
    throw error
  }
}

const EXPIRACAO_RONDA_MS = 24 * 60 * 60 * 1000

export async function expirarRondasAbertas(): Promise<{ expiradas: number }> {
  try {
    const limite = new Date(Date.now() - EXPIRACAO_RONDA_MS)
    const result = await prisma.$executeRaw`
      UPDATE rondas_ocorrencias
      SET "finalizadoEm" = NOW()
      WHERE "finalizadoEm" IS NULL
        AND "atualizadoEm" < ${limite}
    `
    return { expiradas: result }
  } catch (error) {
    console.error('[rondas.service] expirarRondasAbertas:', error)
    throw error
  }
}

export async function listarRondasAdmin(limit = 100, tenantId?: string, tenantIds?: string[]) {
  try {
    // > 0 (e não > 1): com 1 id o `in` equivale à igualdade — antes o caso de
    // exatamente 1 tenantId caía no fallback e, sem tenantId, abria o filtro.
    const where = tenantIds && tenantIds.length > 0
      ? { tenantId: { in: tenantIds } }
      : tenantId ? { tenantId } : undefined
    return await prisma.rondaOcorrencia.findMany({
      where,
      orderBy: { iniciadoEm: 'desc' },
      take: limit,
      select: {
        id: true,
        iniciadoEm: true,
        finalizadoEm: true,
        tenantId: true,
        criadoPor: { select: { id: true, nome: true } },
        tenant: { select: { id: true, nome: true, slug: true } },
        ambientes: {
          orderBy: { concluidoEm: 'asc' as const },
          select: {
            id: true,
            ambiente: true,
            temOcorrencia: true,
            concluidoEm: true,
            ...SELECT_GASES_LISTA,
            ocorrencias: {
              select: { id: true, tipo: true, descricao: true, foto: true, trilogoChamado: true, bemPatrimony: true, bemDescricao: true },
            },
          },
        },
      },
    })
  } catch (error) {
    console.error('[rondas.service] listarRondasAdmin:', error)
    throw error
  }
}
