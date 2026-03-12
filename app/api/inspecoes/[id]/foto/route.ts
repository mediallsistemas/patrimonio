import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Separate endpoint — foto só é buscada quando explicitamente solicitada
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const alteracao = await prisma.alteracao.findUnique({
    where: { inspecaoId: id },
    select: { foto: true },
  })
  if (!alteracao) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json({ foto: alteracao.foto })
}
