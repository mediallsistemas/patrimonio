import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/rodadas/[id]/ambientes — registra um ambiente dentro de uma rodada
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rodadaId } = await params
    const body = await req.json()
    const {
      ambiente,
      purezaO2, pressaoO2, pressaoAr, backupLigado,
      temAbastecimento, abastecimento,
      temAlteracao, alteracao,
    } = body

    const ambienteInspecionado = await prisma.ambienteInspecionado.create({
      data: {
        rodadaId,
        ambiente,
        purezaO2:         Number(purezaO2),
        pressaoO2:        Number(pressaoO2),
        pressaoAr:        Number(pressaoAr),
        backupLigado:     Boolean(backupLigado),
        temAbastecimento: Boolean(temAbastecimento),
        temAlteracao:     Boolean(temAlteracao),
        ...(temAbastecimento && abastecimento
          ? {
              abastecimento: {
                create: {
                  quantidade: Number(abastecimento.quantidade),
                  tamanho:    String(abastecimento.tamanho),
                },
              },
            }
          : {}),
        ...(temAlteracao && alteracao
          ? {
              alteracao: {
                create: {
                  tipo:           alteracao.tipo,
                  descricao:      alteracao.descricao,
                  foto:           alteracao.foto ?? null,
                  trilogoChamado: Boolean(alteracao.trilogoChamado),
                },
              },
            }
          : {}),
      },
      include: {
        abastecimento: true,
        alteracao: {
          select: { id: true, tipo: true, descricao: true, trilogoChamado: true },
        },
      },
    })

    return NextResponse.json(ambienteInspecionado, { status: 201 })
  } catch (err) {
    console.error('Erro ao salvar ambiente:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
