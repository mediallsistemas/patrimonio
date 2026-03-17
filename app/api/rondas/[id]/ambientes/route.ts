import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/rondas/[id]/ambientes — registra um ambiente dentro de uma ronda
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rondaId } = await params
    const body = await req.json()
    const { ambiente, temOcorrencia, ocorrencia } = body

    const registro = await prisma.registroAmbiente.create({
      data: {
        rondaId,
        ambiente,
        temOcorrencia: Boolean(temOcorrencia),
        ...(temOcorrencia && ocorrencia
          ? {
              ocorrencia: {
                create: {
                  tipo:           ocorrencia.tipo,
                  descricao:      ocorrencia.descricao,
                  foto:           ocorrencia.foto ?? null,
                  trilogoChamado: Boolean(ocorrencia.trilogoChamado),
                },
              },
            }
          : {}),
      },
      include: {
        ocorrencia: {
          select: { id: true, tipo: true, descricao: true, trilogoChamado: true },
        },
      },
    })

    return NextResponse.json(registro, { status: 201 })
  } catch (err) {
    console.error('Erro ao salvar ambiente:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
