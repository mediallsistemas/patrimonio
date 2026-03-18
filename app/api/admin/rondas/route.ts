import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const [rondas, tenants] = await Promise.all([
    prisma.rondaOcorrencia.findMany({
      orderBy: { iniciadoEm: 'desc' },
      take: 100,
      include: {
        ambientes: {
          orderBy: { concluidoEm: 'asc' },
          include: {
            ocorrencia: {
              select: { id: true, tipo: true, descricao: true, trilogoChamado: true },
            },
          },
        },
      },
    }),
    prisma.tenant.findMany({ select: { id: true, nome: true, slug: true } }),
  ])

  const tenantMap = Object.fromEntries(tenants.map((t) => [t.id, t]))

  const result = rondas.map((r) => ({
    ...r,
    tenant: tenantMap[r.tenantId] ?? { id: r.tenantId, nome: 'Desconhecido', slug: '' },
  }))

  return NextResponse.json(result)
}
