import { prisma } from '@/lib/db'
import { tenantFilter } from '@/modules/auth/tenant-filter'
import { estaAtrasado, sanitizarParaRole, STATUS_ABERTOS } from './chamados.rules'
import type { JWTPayload } from '@/modules/auth/auth.types'
import type { FiltrosChamados } from './chamados.types'

// Leituras do domínio de chamados. Fotos nunca entram nas listas (lazy via
// buscarFotos). Campos fiscais são sanitizados por role antes de retornar.

type Role = JWTPayload['role']
type EscopoTenant = { tenantId: string | null; tenantIds?: string[] }

// Select das listas — sem fotos (base64 pesado fica no endpoint de foto)
const SELECT_LISTA = {
  id: true,
  numero: true,
  titulo: true,
  descricao: true,
  tipo: true,
  prioridade: true,
  status: true,
  prazo: true,
  ambienteNomeSnapshot: true,
  blocoNomeSnapshot: true,
  patrimony: true,
  descricaoBemSnapshot: true,
  assumidoEm: true,
  finalizadoEm: true,
  criadoEm: true,
  descricaoExecucao: true,
  observacaoFinal: true,
  criadoPor: { select: { id: true, nome: true } },
  responsavel: { select: { id: true, nome: true } },
  // Fiscais — removidos por sanitizarParaRole quando o role não é admin
  fornecedor: true,
  numeroOrdemCompra: true,
  valorGastoCentavos: true,
} as const

function comAtraso<T extends { status: string; prazo: Date }>(chamado: T, agora: Date) {
  return { ...chamado, atrasado: estaAtrasado(chamado, agora) }
}

export async function listar(escopo: EscopoTenant, role: Role, filtros: FiltrosChamados = {}) {
  try {
    const agora = new Date()
    const chamados = await prisma.chamado.findMany({
      where: {
        ...tenantFilter(escopo),
        ...(filtros.status ? { status: filtros.status } : {}),
        ...(filtros.prioridade ? { prioridade: filtros.prioridade } : {}),
        ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
        ...(filtros.responsavelId ? { responsavelId: filtros.responsavelId } : {}),
        ...(filtros.atrasados
          ? { status: { in: [...STATUS_ABERTOS] }, prazo: { lt: agora } }
          : {}),
      },
      orderBy: [{ status: 'asc' }, { prazo: 'asc' }],
      take: 200,
      select: SELECT_LISTA,
    })
    return chamados.map((c) => sanitizarParaRole(comAtraso(c, agora), role))
  } catch (error) {
    console.error('[chamados-query.service] listar:', error)
    throw error
  }
}

export async function buscar(id: string, escopo: EscopoTenant, role: Role) {
  try {
    const chamado = await prisma.chamado.findFirst({
      where: { id, ...tenantFilter(escopo) },
      select: SELECT_LISTA,
    })
    if (!chamado) return null
    return sanitizarParaRole(comAtraso(chamado, new Date()), role)
  } catch (error) {
    console.error('[chamados-query.service] buscar:', error)
    throw error
  }
}

// Fotos sob demanda (abertura + execução) — padrão FotoLazy do projeto
export async function buscarFotos(id: string, escopo: EscopoTenant) {
  try {
    return await prisma.chamado.findFirst({
      where: { id, ...tenantFilter(escopo) },
      select: { fotoAbertura: true, fotoExecucao: true },
    })
  } catch (error) {
    console.error('[chamados-query.service] buscarFotos:', error)
    throw error
  }
}

// ── Dashboard (admin) — espelha o painel da planilha ────────────────────────
// Agregações no banco (groupBy), nunca em memória. Valor gasto só chega aqui
// porque a rota restringe o acesso a admin.

export interface DashboardChamados {
  total: number
  finalizados: number
  emExecucao: number
  abertos: number
  atrasados: number
  valorGastoCentavos: number
  porStatus: { status: string; qtde: number }[]
  porPrioridade: { prioridade: string; qtde: number }[]
  porTipo: { tipo: string; qtde: number }[]
  porResponsavel: { responsavelId: string | null; nome: string; qtde: number }[]
}

export async function dashboard(
  escopo: EscopoTenant,
  periodo?: { de?: Date; ate?: Date },
): Promise<DashboardChamados> {
  try {
    const agora = new Date()
    const whereBase = {
      ...tenantFilter(escopo),
      ...(periodo?.de || periodo?.ate
        ? { criadoEm: { ...(periodo.de ? { gte: periodo.de } : {}), ...(periodo.ate ? { lte: periodo.ate } : {}) } }
        : {}),
    }

    const [porStatus, porPrioridade, porTipo, porResponsavel, atrasados, valorGasto] =
      await Promise.all([
        prisma.chamado.groupBy({ by: ['status'], where: whereBase, _count: { id: true } }),
        prisma.chamado.groupBy({ by: ['prioridade'], where: whereBase, _count: { id: true } }),
        prisma.chamado.groupBy({ by: ['tipo'], where: whereBase, _count: { id: true } }),
        prisma.chamado.groupBy({ by: ['responsavelId'], where: whereBase, _count: { id: true } }),
        prisma.chamado.count({
          where: { ...whereBase, status: { in: [...STATUS_ABERTOS] }, prazo: { lt: agora } },
        }),
        prisma.chamado.aggregate({
          where: { ...whereBase, status: { not: 'cancelado' } },
          _sum: { valorGastoCentavos: true },
        }),
      ])

    // Nomes dos responsáveis em uma query única
    const responsavelIds = porResponsavel
      .map((r) => r.responsavelId)
      .filter((id): id is string => id !== null)
    const usuarios = responsavelIds.length
      ? await prisma.usuario.findMany({
          where: { id: { in: responsavelIds } },
          select: { id: true, nome: true },
        })
      : []
    const nomePorId = new Map(usuarios.map((u) => [u.id, u.nome]))

    const contagem = (status: string) =>
      porStatus.find((s) => s.status === status)?._count.id ?? 0

    return {
      total: porStatus.reduce((acc, s) => acc + s._count.id, 0),
      finalizados: contagem('finalizado'),
      emExecucao: contagem('em_execucao'),
      abertos: contagem('aberto'),
      atrasados,
      valorGastoCentavos: valorGasto._sum.valorGastoCentavos ?? 0,
      porStatus: porStatus.map((s) => ({ status: s.status, qtde: s._count.id })),
      porPrioridade: porPrioridade.map((p) => ({ prioridade: p.prioridade, qtde: p._count.id })),
      porTipo: porTipo.map((t) => ({ tipo: t.tipo, qtde: t._count.id })),
      porResponsavel: porResponsavel.map((r) => ({
        responsavelId: r.responsavelId,
        nome: r.responsavelId ? (nomePorId.get(r.responsavelId) ?? '—') : 'Sem responsável',
        qtde: r._count.id,
      })),
    }
  } catch (error) {
    console.error('[chamados-query.service] dashboard:', error)
    throw error
  }
}
