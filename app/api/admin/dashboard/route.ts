import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const hoje = new Date()
  const inicioDia = startOfDay(hoje)
  const fimDia = endOfDay(hoje)

  const [tenants, totalPessoas, retiradasHoje, devolucoesHoje, recentes] = await Promise.all([
    prisma.tenant.findMany({ select: { id: true, nome: true, slug: true } }),
    prisma.pessoa.count(),
    prisma.movimentacao.count({
      where: { tipo: 'retirada', dataHora: { gte: inicioDia, lte: fimDia } },
    }),
    prisma.movimentacao.count({
      where: { tipo: 'devolucao', dataHora: { gte: inicioDia, lte: fimDia } },
    }),
    prisma.movimentacao.findMany({
      include: {
        pessoa: { select: { nome: true, cpf: true } },
        tenant: { select: { nome: true, slug: true } },
      },
      orderBy: { dataHora: 'desc' },
      take: 20,
    }),
  ])

  // Pendentes por tenant
  const porTenant = await Promise.all(
    tenants.map(async (t) => {
      const [pessoas, retHoje, devHoje] = await Promise.all([
        prisma.pessoa.count({ where: { tenantId: t.id } }),
        prisma.movimentacao.count({
          where: { tenantId: t.id, tipo: 'retirada', dataHora: { gte: inicioDia, lte: fimDia } },
        }),
        prisma.movimentacao.count({
          where: { tenantId: t.id, tipo: 'devolucao', dataHora: { gte: inicioDia, lte: fimDia } },
        }),
      ])

      // Pendentes = retiradas sem devolução
      const todasPessoas = await prisma.pessoa.findMany({
        where: { tenantId: t.id },
        select: { id: true },
      })
      const pendentesArr = await Promise.all(
        todasPessoas.map(async (p) => {
          const [ret, dev] = await Promise.all([
            prisma.movimentacao.count({ where: { pessoaId: p.id, tipo: 'retirada' } }),
            prisma.movimentacao.count({ where: { pessoaId: p.id, tipo: 'devolucao' } }),
          ])
          return Math.max(0, ret - dev)
        }),
      )
      const pendentes = pendentesArr.reduce((a, b) => a + b, 0)

      return { tenant: t, pessoas, retiradasHoje: retHoje, devolucoesHoje: devHoje, pendentes }
    }),
  )

  // Gráfico últimos 7 dias (global)
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

  const totalPendentes = porTenant.reduce((a, b) => a + b.pendentes, 0)

  const recentesMapped = recentes.map((m) => ({
    id: m.id,
    pessoa_id: m.pessoaId,
    tipo: m.tipo,
    data_hora: m.dataHora,
    pessoa_nome: m.pessoa.nome,
    pessoa_cpf: m.pessoa.cpf,
    tenant_nome: m.tenant.nome,
    tenant_slug: m.tenant.slug,
  }))

  return NextResponse.json({
    totalPessoas,
    retiradasHoje,
    devolucoesHoje,
    totalPendentes,
    movimentacoesPorDia,
    recentes: recentesMapped,
    porTenant,
  })
}
