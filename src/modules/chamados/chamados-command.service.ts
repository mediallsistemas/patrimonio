import { prisma } from '@/lib/db'
import { tenantFilter } from '@/modules/auth/tenant-filter'
import { STATUS_ABERTOS } from './chamados.rules'
import type {
  CriarChamadoInput,
  AssumirChamadoInput,
  AtribuirChamadoInput,
  FinalizarChamadoInput,
  EditarFiscalInput,
} from './chamados.types'

// Escritas do domínio de chamados. IDs de usuário sempre vêm do JWT (rota),
// nunca do body. Transições de status são atômicas via updateMany condicional
// (o where inclui o status de origem — corrida entre dois "assumir" só premia um).

type EscopoTenant = { tenantId: string | null; tenantIds?: string[] }

const SELECT_RESUMO = {
  id: true,
  numero: true,
  status: true,
  prioridade: true,
  criadoEm: true,
} as const

export async function criar(
  tenantId: string,
  criadoPorId: string,
  input: CriarChamadoInput,
  // Atribuição direta na criação — a rota só preenche quando o role é admin
  atribuicao?: { responsavelId: string; atribuidoPorId: string },
) {
  try {
    // Snapshot do ambiente e do bloco preserva o histórico do chamado
    const ambiente = await prisma.ambienteTenant.findFirst({
      where: { id: input.ambienteId, tenantId, ativo: true },
      select: { id: true, nome: true, bloco: { select: { nome: true } } },
    })
    if (!ambiente) throw new Error('ambiente não encontrado')

    let dadosAtribuicao = {}
    if (atribuicao) {
      // Responsável precisa existir, estar ativo e pertencer ao mesmo tenant
      const responsavel = await prisma.usuario.findFirst({
        where: { id: atribuicao.responsavelId, tenantId, ativo: true },
        select: { id: true },
      })
      if (!responsavel) throw new Error('responsável inválido')
      dadosAtribuicao = {
        responsavelId: atribuicao.responsavelId,
        atribuidoPorId: atribuicao.atribuidoPorId,
        assumidoEm: new Date(),
        status: 'em_execucao',
      }
    }

    return await prisma.chamado.create({
      data: {
        tenantId,
        criadoPorId,
        titulo: input.titulo,
        descricao: input.descricao,
        tipo: input.tipo,
        prioridade: input.prioridade,
        prazo: input.prazo,
        ambienteId: ambiente.id,
        ambienteNomeSnapshot: ambiente.nome,
        blocoNomeSnapshot: ambiente.bloco?.nome ?? null,
        trilogoAssetId: input.trilogoAssetId ?? null,
        patrimony: input.patrimony ?? null,
        descricaoBemSnapshot: input.descricaoBem ?? null,
        fotoAbertura: input.fotoAbertura ?? null,
        ...dadosAtribuicao,
      },
      select: SELECT_RESUMO,
    })
  } catch (error) {
    console.error('[chamados-command.service] criar:', error)
    throw error
  }
}

// Assumir: quem assume vira o responsável. Só a partir de 'aberto'.
// Retorna null quando o chamado não existe, não é do tenant ou já foi assumido.
export async function assumir(
  id: string,
  escopo: EscopoTenant,
  userId: string,
  input: AssumirChamadoInput,
) {
  try {
    const { count } = await prisma.chamado.updateMany({
      where: { id, status: 'aberto', ...tenantFilter(escopo) },
      data: {
        status: 'em_execucao',
        responsavelId: userId,
        assumidoEm: new Date(),
        atualizadoPorId: userId,
        ...(input.prioridade ? { prioridade: input.prioridade } : {}),
      },
    })
    if (count === 0) return null

    return await prisma.chamado.findFirst({
      where: { id, ...tenantFilter(escopo) },
      select: { ...SELECT_RESUMO, responsavelId: true, assumidoEm: true },
    })
  } catch (error) {
    console.error('[chamados-command.service] assumir:', error)
    throw error
  }
}

// Atribuir (admin): define/troca o responsável enquanto o chamado está vivo.
export async function atribuir(
  id: string,
  escopo: EscopoTenant,
  adminId: string,
  input: AtribuirChamadoInput,
) {
  try {
    const chamado = await prisma.chamado.findFirst({
      where: { id, status: { in: [...STATUS_ABERTOS] }, ...tenantFilter(escopo) },
      select: { id: true, tenantId: true },
    })
    if (!chamado) return null

    // Responsável precisa pertencer ao tenant do chamado (importa no super_admin)
    const responsavel = await prisma.usuario.findFirst({
      where: { id: input.responsavelId, tenantId: chamado.tenantId, ativo: true },
      select: { id: true },
    })
    if (!responsavel) return null

    return await prisma.chamado.update({
      where: { id },
      data: {
        status: 'em_execucao',
        responsavelId: input.responsavelId,
        atribuidoPorId: adminId,
        assumidoEm: new Date(),
        atualizadoPorId: adminId,
        ...(input.prioridade ? { prioridade: input.prioridade } : {}),
      },
      select: { ...SELECT_RESUMO, responsavelId: true, assumidoEm: true },
    })
  } catch (error) {
    console.error('[chamados-command.service] atribuir:', error)
    throw error
  }
}

// Finalizar: qualquer usuário com escrita, a partir de 'aberto' ou 'em_execucao'.
export async function finalizar(
  id: string,
  escopo: EscopoTenant,
  userId: string,
  input: FinalizarChamadoInput,
) {
  try {
    const { count } = await prisma.chamado.updateMany({
      where: { id, status: { in: [...STATUS_ABERTOS] }, ...tenantFilter(escopo) },
      data: {
        status: 'finalizado',
        descricaoExecucao: input.descricaoExecucao,
        fotoExecucao: input.fotoExecucao ?? null,
        observacaoFinal: input.observacaoFinal ?? null,
        finalizadoEm: new Date(),
        finalizadoPorId: userId,
        atualizadoPorId: userId,
      },
    })
    if (count === 0) return null

    return await prisma.chamado.findFirst({
      where: { id, ...tenantFilter(escopo) },
      select: { ...SELECT_RESUMO, finalizadoEm: true },
    })
  } catch (error) {
    console.error('[chamados-command.service] finalizar:', error)
    throw error
  }
}

// Cancelar (admin): a partir de qualquer status vivo.
export async function cancelar(id: string, escopo: EscopoTenant, adminId: string) {
  try {
    const { count } = await prisma.chamado.updateMany({
      where: { id, status: { in: [...STATUS_ABERTOS] }, ...tenantFilter(escopo) },
      data: { status: 'cancelado', atualizadoPorId: adminId },
    })
    if (count === 0) return null

    return await prisma.chamado.findFirst({
      where: { id, ...tenantFilter(escopo) },
      select: SELECT_RESUMO,
    })
  } catch (error) {
    console.error('[chamados-command.service] cancelar:', error)
    throw error
  }
}

// Campos fiscais (admin): fornecedor, nº ordem de compra, valor gasto.
export async function editarFiscal(
  id: string,
  escopo: EscopoTenant,
  adminId: string,
  input: EditarFiscalInput,
) {
  try {
    const existente = await prisma.chamado.findFirst({
      where: { id, ...tenantFilter(escopo) },
      select: { id: true },
    })
    if (!existente) return null

    return await prisma.chamado.update({
      where: { id },
      data: {
        ...(input.fornecedor !== undefined ? { fornecedor: input.fornecedor } : {}),
        ...(input.numeroOrdemCompra !== undefined
          ? { numeroOrdemCompra: input.numeroOrdemCompra }
          : {}),
        ...(input.valorGastoCentavos !== undefined
          ? { valorGastoCentavos: input.valorGastoCentavos }
          : {}),
        atualizadoPorId: adminId,
      },
      select: {
        ...SELECT_RESUMO,
        fornecedor: true,
        numeroOrdemCompra: true,
        valorGastoCentavos: true,
      },
    })
  } catch (error) {
    console.error('[chamados-command.service] editarFiscal:', error)
    throw error
  }
}
