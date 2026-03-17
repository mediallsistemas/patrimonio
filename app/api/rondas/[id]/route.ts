import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PATCH /api/rondas/[id] — finaliza a ronda (seta finalizadoEm)
export async function PATCH(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ronda = await prisma.rondaOcorrencia.update({
    where: { id },
    data: { finalizadoEm: new Date() },
  })
  return NextResponse.json(ronda)
}
