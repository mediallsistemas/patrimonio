import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const inspecoes = await prisma.inspecao.findMany({
    orderBy: { criadoEm: 'desc' },
    take: 50,
    include: {
      alteracao: {
        select: {
          id: true,
          tipo: true,
          descricao: true,
          trilogoChamado: true,
          // never select foto here — fetched individually on demand
        },
      },
    },
  })
  return NextResponse.json(inspecoes)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { ambiente, purezaO2, pressaoO2, pressaoAr, backupLigado, temAlteracao, alteracao } = body

  const inspecao = await prisma.inspecao.create({
    data: {
      ambiente,
      purezaO2: Number(purezaO2),
      pressaoO2: Number(pressaoO2),
      pressaoAr: Number(pressaoAr),
      backupLigado: Boolean(backupLigado),
      temAlteracao: Boolean(temAlteracao),
      ...(temAlteracao && alteracao
        ? {
            alteracao: {
              create: {
                tipo: alteracao.tipo,
                descricao: alteracao.descricao,
                foto: alteracao.foto ?? null,
                trilogoChamado: Boolean(alteracao.trilogoChamado),
              },
            },
          }
        : {}),
    },
    include: { alteracao: true },
  })

  return NextResponse.json(inspecao, { status: 201 })
}
