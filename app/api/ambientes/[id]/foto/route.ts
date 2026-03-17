import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/ambientes/[id]/foto — retorna apenas a foto de uma alteração (lazy)
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const alteracao = await prisma.alteracao.findUnique({
    where: { ambienteInspecionadoId: id },
    select: { foto: true },
  })
  if (!alteracao) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json({ foto: alteracao.foto })
}
