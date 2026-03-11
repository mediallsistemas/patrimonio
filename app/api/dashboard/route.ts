import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

export async function GET() {
  const hoje = new Date()
  const inicioDia = startOfDay(hoje)
  const fimDia = endOfDay(hoje)

  const [totalPessoas, retiradasHoje, devolucoesHoje, todasPessoas, recentes] = await Promise.all([
    prisma.pessoa.count(),
    prisma.movimentacao.count({
      where: { tipo: 'retirada', dataHora: { gte: inicioDia, lte: fimDia } },
    }),
    prisma.movimentacao.count({
      where: { tipo: 'devolucao', dataHora: { gte: inicioDia, lte: fimDia } },
    }),
    prisma.pessoa.findMany({ select: { id: true } }),
    prisma.movimentacao.findMany({
      include: { pessoa: { select: { nome: true, cpf: true } } },
      orderBy: { dataHora: 'desc' },
      take: 15,
    }),
  ])

  // Calculate total pendentes (JS aggregation)
  const pendentesArr = await Promise.all(
    todasPessoas.map(async (p) => {
      const [ret, dev] = await Promise.all([
        prisma.movimentacao.count({ where: { pessoaId: p.id, tipo: 'retirada' } }),
        prisma.movimentacao.count({ where: { pessoaId: p.id, tipo: 'devolucao' } }),
      ])
      return Math.max(0, ret - dev)
    }),
  )
  const totalPendentes = pendentesArr.reduce((a, b) => a + b, 0)

  // Last 7 days chart data
  const dias = Array.from({ length: 7 }, (_, i) => subDays(hoje, 6 - i))
  const movimentacoesPorDia = await Promise.all(
    dias.map(async (dia) => {
      const [retiradas, devolucoes] = await Promise.all([
        prisma.movimentacao.count({
          where: { tipo: 'retirada', dataHora: { gte: startOfDay(dia), lte: endOfDay(dia) } },
        }),
        prisma.movimentacao.count({
          where: { tipo: 'devolucao', dataHora: { gte: startOfDay(dia), lte: endOfDay(dia) } },
        }),
      ])
      return { data: format(dia, 'dd/MM'), retiradas, devolucoes }
    }),
  )

  const recentesMapped = recentes.map((m) => ({
    id: m.id,
    pessoa_id: m.pessoaId,
    tipo: m.tipo,
    data_hora: m.dataHora,
    pessoa_nome: m.pessoa.nome,
    pessoa_cpf: m.pessoa.cpf,
  }))

  return NextResponse.json({
    totalPessoas,
    retiradasHoje,
    devolucoesHoje,
    totalPendentes,
    movimentacoesPorDia,
    recentes: recentesMapped,
  })
}
