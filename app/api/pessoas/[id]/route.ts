import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pessoa = await prisma.pessoa.findUnique({
    where: { id },
    select: { id: true, nome: true, cpf: true, criadoEm: true },
  })
  if (!pessoa) return NextResponse.json({ message: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(pessoa)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.movimentacao.deleteMany({ where: { pessoaId: id } })
  await prisma.pessoa.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
