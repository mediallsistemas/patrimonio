import { startOfDay, endOfDay } from 'date-fns'

import { prisma } from '@/lib/db'
import { movimentacoesPorDia } from '@/modules/movimentacoes/movimentacoes.service'
import type { DashboardData } from './dashboard.types'

/**
 * Agrega todos os dados do dashboard em 7 queries, independente do número de pessoas.
 * Substitui o padrão N+1 (2 queries por pessoa) com groupBy.
 *
 * @param tenantId - null para visão global (super_admin)
 */
export async function getDashboardData(tenantId: string | null): Promise<DashboardData> {
  try {
    const hoje = new Date()
    const inicioDia = startOfDay(hoje)
    const fimDia = endOfDay(hoje)
    const whereBase = tenantId ? { tenantId } : {}

    // 4 queries paralelas de contagem simples
    const [totalPessoas, retiradasHoje, devolucoesHoje, recentes] = await Promise.all([
      prisma.pessoa.count({ where: whereBase }),
      prisma.movimentacao.count({
        where: { ...whereBase, tipo: 'retirada', dataHora: { gte: inicioDia, lte: fimDia } },
      }),
      prisma.movimentacao.count({
        where: { ...whereBase, tipo: 'devolucao', dataHora: { gte: inicioDia, lte: fimDia } },
      }),
      prisma.movimentacao.findMany({
        where: whereBase,
        select: {
          id: true,
          pessoaId: true,
          tipo: true,
          dataHora: true,
          pessoa: { select: { nome: true, cpf: true } },
        },
        orderBy: { dataHora: 'desc' },
        take: 15,
      }),
    ])

    // 2 queries groupBy para pendentes — substitui N*2 queries
    const [retiradasGrupo, devolucoesGrupo] = await Promise.all([
      prisma.movimentacao.groupBy({
        by: ['pessoaId'],
        where: { ...whereBase, tipo: 'retirada' },
        _count: { id: true },
      }),
      prisma.movimentacao.groupBy({
        by: ['pessoaId'],
        where: { ...whereBase, tipo: 'devolucao' },
        _count: { id: true },
      }),
    ])

    const devMap = new Map(devolucoesGrupo.map((d) => [d.pessoaId, d._count.id]))
    const totalPendentes = retiradasGrupo.reduce((acc, r) => {
      const devs = devMap.get(r.pessoaId) ?? 0
      return acc + Math.max(0, r._count.id - devs)
    }, 0)

    // 1 query para gráfico dos últimos 7 dias (em vez de 14 queries)
    const grafico = await movimentacoesPorDia(tenantId, 7)

    return {
      totalPessoas,
      retiradasHoje,
      devolucoesHoje,
      totalPendentes,
      movimentacoesPorDia: grafico,
      recentes: recentes.map((m) => ({
        id: m.id,
        pessoa_id: m.pessoaId,
        tipo: m.tipo,
        data_hora: m.dataHora,
        pessoa_nome: m.pessoa.nome,
        pessoa_cpf: m.pessoa.cpf,
      })),
    }
  } catch (error) {
    console.error('[dashboard.service] getDashboardData:', error)
    throw error
  }
}
