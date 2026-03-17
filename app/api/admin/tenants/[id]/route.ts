import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params
  const { nome, ativo } = await req.json()

  const tenant = await prisma.tenant.update({
    where: { id },
    data: {
      ...(nome !== undefined && { nome: nome.trim() }),
      ...(ativo !== undefined && { ativo }),
    },
  })

  return NextResponse.json(tenant)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params

  await prisma.tenant.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
