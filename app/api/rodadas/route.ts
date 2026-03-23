import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const where = session.role === 'super_admin' ? {} : { tenantId: session.tenantId! }

  const rodadas = await prisma.rodada.findMany({
    where,
    orderBy: { iniciadoEm: 'desc' },
    take: 50,
    include: {
      ambientes: {
        orderBy: { concluidoEm: 'asc' },
        include: {
          abastecimento: { select: { quantidade: true, tamanho: true } },
          alteracao: {
            select: { id: true, tipo: true, descricao: true, trilogoChamado: true },
          },
        },
      },
    },
  })
  return NextResponse.json(rodadas)
}

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const tenantId = session.role === 'super_admin'
    ? '00000000-0000-0000-0000-000000000001'
    : session.tenantId!

  const rodada = await prisma.rodada.create({ data: { tenantId, criadoPorId: session.userId } })
  return NextResponse.json(rodada, { status: 201 })
}
