import { NextRequest, NextResponse } from 'next/server'
import { getSession, hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params
  const { nome, senha, role, tenantId, ativo } = await req.json()

  const usuario = await prisma.usuario.update({
    where: { id },
    data: {
      ...(nome !== undefined && { nome: nome.trim() }),
      ...(senha ? { senhaHash: await hashPassword(senha) } : {}),
      ...(role !== undefined && { role }),
      ...(tenantId !== undefined && { tenantId: tenantId || null }),
      ...(ativo !== undefined && { ativo }),
    },
    select: { id: true, email: true, nome: true, role: true, ativo: true, criadoEm: true, tenantId: true },
  })

  return NextResponse.json(usuario)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params
  await prisma.usuario.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
