import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params
  const { pessoaId, tipo } = await req.json()

  if (!pessoaId || !tipo || !['retirada', 'devolucao'].includes(tipo)) {
    return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 })
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) return NextResponse.json({ message: 'Tenant não encontrado' }, { status: 404 })

  if (tipo === 'devolucao') {
    const retiradas = await prisma.movimentacao.count({ where: { pessoaId, tenantId: tenant.id, tipo: 'retirada' } })
    const devolucoes = await prisma.movimentacao.count({ where: { pessoaId, tenantId: tenant.id, tipo: 'devolucao' } })
    if (retiradas - devolucoes <= 0) {
      return NextResponse.json({ message: 'Nenhuma retirada pendente para devolver' }, { status: 400 })
    }
  }

  const mov = await prisma.movimentacao.create({
    data: { tenantId: tenant.id, pessoaId, tipo },
  })
  return NextResponse.json({ id: mov.id }, { status: 201 })
}
