import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PATCH /api/rodadas/[id] — finaliza a rodada (seta finalizadoEm)
export async function PATCH(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const rodada = await prisma.rodada.update({
    where: { id },
    data: { finalizadoEm: new Date() },
  })
  return NextResponse.json(rodada)
}
