import { NextRequest, NextResponse } from 'next/server'
import { getSession, hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const usuarios = await prisma.usuario.findMany({
    orderBy: { criadoEm: 'asc' },
    select: {
      id: true, email: true, nome: true, role: true, ativo: true, criadoEm: true,
      tenantId: true, tenant: { select: { slug: true, nome: true } },
    },
  })

  return NextResponse.json(usuarios)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { email, nome, senha, role, tenantId } = await req.json()
  if (!email || !nome || !senha || !role) {
    return NextResponse.json({ error: 'Campos obrigatórios: email, nome, senha, role' }, { status: 400 })
  }

  try {
    const usuario = await prisma.usuario.create({
      data: {
        email: email.trim().toLowerCase(),
        nome: nome.trim(),
        senhaHash: await hashPassword(senha),
        role,
        tenantId: tenantId || null,
      },
      select: { id: true, email: true, nome: true, role: true, ativo: true, criadoEm: true, tenantId: true },
    })
    return NextResponse.json(usuario, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 })
  }
}
