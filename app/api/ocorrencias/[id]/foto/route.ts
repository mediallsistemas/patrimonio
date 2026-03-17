import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/ocorrencias/[id]/foto — retorna apenas a foto de uma ocorrência (lazy)
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ocorrencia = await prisma.ocorrenciaDetalhe.findUnique({
    where: { id },
    select: { foto: true },
  })
  if (!ocorrencia) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json({ foto: ocorrencia.foto })
}
