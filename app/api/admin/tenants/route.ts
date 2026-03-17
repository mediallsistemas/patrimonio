import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: { criadoEm: 'asc' },
    include: { _count: { select: { usuarios: true, pessoas: true } } },
  })

  return NextResponse.json(tenants)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { slug, nome } = await req.json()
  if (!slug || !nome) {
    return NextResponse.json({ error: 'slug e nome são obrigatórios' }, { status: 400 })
  }

  const slugNorm = slug.toLowerCase().trim().replace(/\s+/g, '-')

  try {
    const tenant = await prisma.tenant.create({
      data: { slug: slugNorm, nome: nome.trim() },
    })
    return NextResponse.json(tenant, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Slug já em uso' }, { status: 409 })
  }
}
