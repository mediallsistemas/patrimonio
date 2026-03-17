import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const where = session.role === 'super_admin' ? {} : { tenantId: session.tenantId! }

  const movimentacoes = await prisma.movimentacao.findMany({
    where,
    include: { pessoa: { select: { nome: true, cpf: true } } },
    orderBy: { dataHora: 'desc' },
    take: limit,
  })

  const data = movimentacoes.map((m) => ({
    id:          m.id,
    pessoa_id:   m.pessoaId,
    tipo:        m.tipo,
    data_hora:   m.dataHora,
    pessoa_nome: m.pessoa.nome,
    pessoa_cpf:  m.pessoa.cpf,
  }))

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()

  const { pessoaId, tipo, tenantSlug } = await req.json()

  let tenantId = session?.tenantId ?? null

  if (!tenantId && tenantSlug) {
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    if (!tenant) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 })
    tenantId = tenant.id
  }

  if (!tenantId) return NextResponse.json({ error: 'Sem tenant' }, { status: 403 })

  if (!pessoaId || !tipo) {
    return NextResponse.json({ message: 'Dados incompletos' }, { status: 400 })
  }

  if (!['retirada', 'devolucao'].includes(tipo)) {
    return NextResponse.json({ message: 'Tipo inválido' }, { status: 400 })
  }

  if (tipo === 'devolucao') {
    const retiradas  = await prisma.movimentacao.count({ where: { pessoaId, tenantId, tipo: 'retirada' } })
    const devolucoes = await prisma.movimentacao.count({ where: { pessoaId, tenantId, tipo: 'devolucao' } })
    if (retiradas - devolucoes <= 0) {
      return NextResponse.json({ message: 'Nenhuma retirada pendente para devolver' }, { status: 400 })
    }
  }

  const mov = await prisma.movimentacao.create({
    data: {
      tenantId,
      pessoaId,
      tipo,
    },
  })
  return NextResponse.json({ id: mov.id, pessoaId, tipo }, { status: 201 })
}
