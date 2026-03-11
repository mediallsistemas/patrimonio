import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50')

  const movimentacoes = await prisma.movimentacao.findMany({
    include: { pessoa: { select: { nome: true, cpf: true } } },
    orderBy: { dataHora: 'desc' },
    take: limit,
  })

  // Map to snake_case for API response consistency
  const data = movimentacoes.map((m) => ({
    id: m.id,
    pessoa_id: m.pessoaId,
    tipo: m.tipo,
    data_hora: m.dataHora,
    pessoa_nome: m.pessoa.nome,
    pessoa_cpf: m.pessoa.cpf,
  }))

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { pessoaId, tipo } = await req.json()

  if (!pessoaId || !tipo) {
    return NextResponse.json({ message: 'Dados incompletos' }, { status: 400 })
  }

  if (!['retirada', 'devolucao'].includes(tipo)) {
    return NextResponse.json({ message: 'Tipo inválido' }, { status: 400 })
  }

  if (tipo === 'devolucao') {
    const retiradas = await prisma.movimentacao.count({ where: { pessoaId, tipo: 'retirada' } })
    const devolucoes = await prisma.movimentacao.count({ where: { pessoaId, tipo: 'devolucao' } })
    if (retiradas - devolucoes <= 0) {
      return NextResponse.json({ message: 'Nenhuma retirada pendente para devolver' }, { status: 400 })
    }
  }

  const mov = await prisma.movimentacao.create({ data: { pessoaId, tipo } })
  return NextResponse.json({ id: mov.id, pessoaId, tipo }, { status: 201 })
}
