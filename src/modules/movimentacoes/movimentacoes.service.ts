import { format, subDays, startOfDay, endOfDay } from 'date-fns'

import { prisma } from '@/lib/db'
import {
  MovimentacaoItem,
  MovimentacoesPorDia,
  NenhumaPendenteError,
} from './movimentacoes.types'

export async function listarMovimentacoes(
  tenantId: string | null,
  limit: number,
): Promise<MovimentacaoItem[]> {
  try {
    const where = tenantId ? { tenantId } : {}
    const rows = await prisma.movimentacao.findMany({
      where,
      select: {
        id: true,
        pessoaId: true,
        tipo: true,
        dataHora: true,
        pessoa: { select: { nome: true, cpf: true } },
      },
      orderBy: { dataHora: 'desc' },
      take: limit,
    })
    return rows.map((m) => ({
      id: m.id,
      pessoa_id: m.pessoaId,
      tipo: m.tipo,
      data_hora: m.dataHora,
      pessoa_nome: m.pessoa.nome,
      pessoa_cpf: m.pessoa.cpf,
    }))
  } catch (error) {
    console.error('[movimentacoes.service] listarMovimentacoes:', error)
    throw error
  }
}

/**
 * Conta pendentes de uma pessoa via groupBy — uma query ao invés de duas.
 */
export async function contarPendentes(tenantId: string, pessoaId: string): Promise<number> {
  try {
    const grupos = await prisma.movimentacao.groupBy({
      by: ['tipo'],
      where: { tenantId, pessoaId },
      _count: { id: true },
    })
    const retiradas = grupos.find((g) => g.tipo === 'retirada')?._count.id ?? 0
    const devolucoes = grupos.find((g) => g.tipo === 'devolucao')?._count.id ?? 0
    return Math.max(0, retiradas - devolucoes)
  } catch (error) {
    console.error('[movimentacoes.service] contarPendentes:', error)
    throw error
  }
}

export async function criarMovimentacao(
  tenantId: string,
  pessoaId: string,
  tipo: 'retirada' | 'devolucao',
): Promise<{ id: string; pessoaId: string; tipo: string }> {
  try {
    if (tipo === 'devolucao') {
      const pendentes = await contarPendentes(tenantId, pessoaId)
      if (pendentes <= 0) throw new NenhumaPendenteError()
    }

    const mov = await prisma.movimentacao.create({
      data: { tenantId, pessoaId, tipo },
      select: { id: true, pessoaId: true, tipo: true },
    })
    return mov
  } catch (error) {
    if (error instanceof NenhumaPendenteError) throw error
    console.error('[movimentacoes.service] criarMovimentacao:', error)
    throw error
  }
}

/**
 * Retorna contagens de retiradas e devoluções agrupadas por dia.
 * Uma única query + agregação em JS, ao invés de 14 queries separadas.
 */
export async function movimentacoesPorDia(
  tenantId: string | null,
  dias = 7,
): Promise<MovimentacoesPorDia[]> {
  try {
    const hoje = new Date()
    const inicio = startOfDay(subDays(hoje, dias - 1))
    const fim = endOfDay(hoje)

    const where = {
      dataHora: { gte: inicio, lte: fim },
      ...(tenantId ? { tenantId } : {}),
    }

    const rows = await prisma.movimentacao.findMany({
      where,
      select: { tipo: true, dataHora: true },
    })

    // Pré-popula o mapa com todos os dias no período
    const diasMap = new Map<string, MovimentacoesPorDia>()
    for (let i = dias - 1; i >= 0; i--) {
      const key = format(subDays(hoje, i), 'dd/MM')
      diasMap.set(key, { data: key, retiradas: 0, devolucoes: 0 })
    }

    // Agrega em JS — evita 14 round-trips ao banco
    for (const row of rows) {
      const key = format(new Date(row.dataHora), 'dd/MM')
      const entry = diasMap.get(key)
      if (!entry) continue
      if (row.tipo === 'retirada') entry.retiradas++
      else entry.devolucoes++
    }

    return Array.from(diasMap.values())
  } catch (error) {
    console.error('[movimentacoes.service] movimentacoesPorDia:', error)
    throw error
  }
}
