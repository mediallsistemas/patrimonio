import { prisma } from '@/lib/db'
import { tenantFilter, filtroEscopo } from '@/modules/auth/tenant-filter'
import type { EscopoLeitura } from '@/modules/auth/tenant-filter'
import type { IniciarManutencaoInput, FinalizarManutencaoInput } from './manutencoes.types'

export async function iniciar(
  tenantId: string,
  criadoPorId: string,
  input: IniciarManutencaoInput,
) {
  try {
    if (input.tipo === 'patrimonio') {
      return await prisma.manutencaoRealizada.create({
        data: {
          tenantId,
          criadoPorId,
          tipo: 'patrimonio',
          status: 'em_andamento',
          trilogoAssetId: input.trilogoAssetId,
          patrimony: input.patrimony,
          descricaoBemSnapshot: input.descricaoBem,
          subtipoPatrimonio: input.subtipoPatrimonio,
          descricao: input.descricao,
          fotoAntes: input.fotoAntes,
        },
        select: { id: true, status: true, iniciadaEm: true },
      })
    }

    // eletrica | hidraulica | predial: snapshot do ambiente e do bloco para histórico
    const ambiente = await prisma.ambienteTenant.findFirst({
      where: { id: input.ambienteId, tenantId, ativo: true },
      select: { id: true, nome: true, bloco: { select: { nome: true } } },
    })
    if (!ambiente) throw new Error('ambiente não encontrado')

    return await prisma.manutencaoRealizada.create({
      data: {
        tenantId,
        criadoPorId,
        tipo: input.tipo,
        status: 'em_andamento',
        ambienteId: ambiente.id,
        ambienteNomeSnapshot: ambiente.nome,
        blocoNomeSnapshot: ambiente.bloco?.nome ?? null,
        descricao: input.descricao,
        fotoAntes: input.fotoAntes,
      },
      select: { id: true, status: true, iniciadaEm: true },
    })
  } catch (error) {
    console.error('[manutencoes.service] iniciar:', error)
    throw error
  }
}

export async function finalizar(
  tenantId: string,
  id: string,
  input: FinalizarManutencaoInput,
) {
  try {
    // Qualquer operador da unidade pode finalizar uma manutenção em aberto —
    // um inicia (foto antes) e outro pode concluir (foto depois). O escopo por
    // tenantId preserva o isolamento; a ausência do filtro por criadoPorId é
    // de propósito.
    const existente = await prisma.manutencaoRealizada.findFirst({
      where: { id, tenantId, status: 'em_andamento' },
      select: { id: true },
    })
    if (!existente) return null

    return await prisma.manutencaoRealizada.update({
      where: { id },
      data: {
        status: 'concluida',
        fotoDepois: input.fotoDepois,
        observacaoFinal: input.observacaoFinal ?? null,
        finalizadaEm: new Date(),
      },
      select: { id: true, status: true, finalizadaEm: true },
    })
  } catch (error) {
    console.error('[manutencoes.service] finalizar:', error)
    throw error
  }
}

// Lista manutenções concluídas para um conjunto de bens, restrita às unidades
// do solicitante. Usado no modal /admin/bens e na página de QR /bem/[token].
// Fotos não são incluídas aqui — a leitura individual é feita sob demanda.
//
// O escopo é obrigatório de propósito: os ids de bem do Trílogo são inteiros
// sequenciais de uma instância compartilhada entre os hospitais, então sem
// filtro de unidade o parâmetro assetIds vira uma varredura enumerável.
export async function listarRealizadasPorAssets(
  trilogoAssetIds: number[],
  escopo: EscopoLeitura,
) {
  try {
    if (trilogoAssetIds.length === 0) return []
    return await prisma.manutencaoRealizada.findMany({
      where: {
        tipo: 'patrimonio',
        status: 'concluida',
        trilogoAssetId: { in: trilogoAssetIds },
        ...filtroEscopo(escopo),
      },
      orderBy: { finalizadaEm: 'desc' },
      select: {
        id: true,
        trilogoAssetId: true,
        patrimony: true,
        descricaoBemSnapshot: true,
        subtipoPatrimonio: true,
        descricao: true,
        observacaoFinal: true,
        iniciadaEm: true,
        finalizadaEm: true,
        criadoPor: { select: { nome: true } },
      },
    })
  } catch (error) {
    console.error('[manutencoes.service] listarRealizadasPorAssets:', error)
    throw error
  }
}

// Lista todas as manutenções realizadas do tenant (qualquer tipo/status),
// para o relatório/histórico. Fotos não são incluídas — leitura sob demanda
// via buscarRealizadaComFotos.
export async function listarHistorico(tenantId: string | null, tenantIds?: string[]) {
  try {
    return await prisma.manutencaoRealizada.findMany({
      where: tenantFilter({ tenantId, tenantIds }),
      orderBy: { iniciadaEm: 'desc' },
      select: {
        id: true,
        tipo: true,
        status: true,
        ambienteNomeSnapshot: true,
        blocoNomeSnapshot: true,
        patrimony: true,
        descricaoBemSnapshot: true,
        subtipoPatrimonio: true,
        descricao: true,
        observacaoFinal: true,
        iniciadaEm: true,
        finalizadaEm: true,
        criadoPor: { select: { nome: true } },
      },
    })
  } catch (error) {
    console.error('[manutencoes.service] listarHistorico:', error)
    throw error
  }
}

/**
 * Todas as manutenções das unidades do escopo, para o painel gerencial do admin.
 *
 * Difere de `listarHistorico` em duas coisas: atravessa unidades (o super_admin
 * enxerga todas) e traz as fotos, porque a tela mostra antes/depois direto na
 * lista em vez de abrir uma por uma.
 */
export async function listarManutencoesAdmin(escopo: EscopoLeitura) {
  try {
    return await prisma.manutencaoRealizada.findMany({
      where: filtroEscopo(escopo),
      orderBy: { iniciadaEm: 'desc' },
      take: 500,
      select: {
        id: true,
        tipo: true,
        status: true,
        descricao: true,
        ambienteNomeSnapshot: true,
        blocoNomeSnapshot: true,
        patrimony: true,
        descricaoBemSnapshot: true,
        subtipoPatrimonio: true,
        observacaoFinal: true,
        fotoAntes: true,
        fotoDepois: true,
        iniciadaEm: true,
        finalizadaEm: true,
        criadoPor: { select: { nome: true } },
        tenant: { select: { id: true, nome: true } },
      },
    })
  } catch (error) {
    console.error('[manutencoes.service] listarManutencoesAdmin:', error)
    throw error
  }
}

// Lê uma manutenção individual com as fotos. Usado pelo endpoint de detalhe
// (modal de bem público e drill-down do relatório de manutenções).
// Escopo obrigatório: as fotos antes/depois são o dado mais sensível da tabela.
export async function buscarRealizadaComFotos(id: string, escopo: EscopoLeitura) {
  try {
    return await prisma.manutencaoRealizada.findFirst({
      where: { id, ...filtroEscopo(escopo) },
      select: {
        id: true,
        tipo: true,
        status: true,
        trilogoAssetId: true,
        patrimony: true,
        descricaoBemSnapshot: true,
        subtipoPatrimonio: true,
        ambienteNomeSnapshot: true,
        blocoNomeSnapshot: true,
        descricao: true,
        observacaoFinal: true,
        fotoAntes: true,
        fotoDepois: true,
        iniciadaEm: true,
        finalizadaEm: true,
        criadoPor: { select: { nome: true } },
      },
    })
  } catch (error) {
    console.error('[manutencoes.service] buscarRealizadaComFotos:', error)
    throw error
  }
}

// Manutenções em aberto (não finalizadas) da UNIDADE — qualquer operador pode
// retomar e finalizar. Inclui quem iniciou (fez a foto antes) para dar contexto
// na tela, agora que a lista atravessa operadores. Escopo obrigatório por tenantId.
export async function listarEmAndamentoDaUnidade(tenantId: string) {
  try {
    return await prisma.manutencaoRealizada.findMany({
      where: { tenantId, status: 'em_andamento' },
      orderBy: { iniciadaEm: 'desc' },
      select: {
        id: true,
        tipo: true,
        iniciadaEm: true,
        descricao: true,
        ambienteId: true,
        ambienteNomeSnapshot: true,
        blocoNomeSnapshot: true,
        trilogoAssetId: true,
        patrimony: true,
        descricaoBemSnapshot: true,
        criadoPor: { select: { nome: true } },
      },
    })
  } catch (error) {
    console.error('[manutencoes.service] listarEmAndamentoDaUnidade:', error)
    throw error
  }
}
