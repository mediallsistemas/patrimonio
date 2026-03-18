import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId')

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 })
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, nome: true, slug: true },
  })

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 })
  }

  const hoje = new Date()
  const inicioDia = startOfDay(hoje)
  const fimDia = endOfDay(hoje)

  // Todas as queries filtradas pelo tenant
  const [totalPessoas, retiradasHoje, devolucoesHoje, recentes] = await Promise.all([
    prisma.pessoa.count({ where: { tenantId } }),
    prisma.movimentacao.count({
      where: { tenantId, tipo: 'retirada', dataHora: { gte: inicioDia, lte: fimDia } },
    }),
    prisma.movimentacao.count({
      where: { tenantId, tipo: 'devolucao', dataHora: { gte: inicioDia, lte: fimDia } },
    }),
    prisma.movimentacao.findMany({
      where: { tenantId },
      include: { pessoa: { select: { nome: true, cpf: true } } },
      orderBy: { dataHora: 'desc' },
      take: 40,
    }),
  ])

  // Pendentes: conta retiradas e devoluções totais por pessoa em uma única query usando groupBy
  const [retiradasPorPessoa, devolucoesPorPessoa] = await Promise.all([
    prisma.movimentacao.groupBy({
      by: ['pessoaId'],
      where: { tenantId, tipo: 'retirada' },
      _count: { id: true },
    }),
    prisma.movimentacao.groupBy({
      by: ['pessoaId'],
      where: { tenantId, tipo: 'devolucao' },
      _count: { id: true },
    }),
  ])

  const devMap = new Map(devolucoesPorPessoa.map((d) => [d.pessoaId, d._count.id]))
  const totalPendentes = retiradasPorPessoa.reduce((acc, r) => {
    const devs = devMap.get(r.pessoaId) ?? 0
    return acc + Math.max(0, r._count.id - devs)
  }, 0)

  // Gráfico 7 dias: uma única query agrupada por dia e tipo
  const seteDiasAtras = startOfDay(subDays(hoje, 6))
  const movsPorDiaRaw = await prisma.movimentacao.findMany({
    where: {
      tenantId,
      dataHora: { gte: seteDiasAtras, lte: fimDia },
    },
    select: { tipo: true, dataHora: true },
  })

  const diasMap = new Map<string, { retiradas: number; devolucoes: number }>()
  for (let i = 6; i >= 0; i--) {
    const key = format(subDays(hoje, i), 'dd/MM')
    diasMap.set(key, { retiradas: 0, devolucoes: 0 })
  }
  for (const m of movsPorDiaRaw) {
    const key = format(new Date(m.dataHora), 'dd/MM')
    const entry = diasMap.get(key)
    if (!entry) continue
    if (m.tipo === 'retirada') entry.retiradas++
    else entry.devolucoes++
  }
  const movimentacoesPorDia = Array.from(diasMap.entries()).map(([data, v]) => ({ data, ...v }))

  const recentesMapped = recentes.map((m) => ({
    id: m.id,
    pessoa_id: m.pessoaId,
    tipo: m.tipo,
    data_hora: m.dataHora,
    pessoa_nome: m.pessoa.nome,
    pessoa_cpf: m.pessoa.cpf,
  }))

  return NextResponse.json({
    tenant,
    totalPessoas,
    retiradasHoje,
    devolucoesHoje,
    totalPendentes,
    movimentacoesPorDia,
    recentes: recentesMapped,
  })
}