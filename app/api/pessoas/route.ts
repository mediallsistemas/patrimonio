import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const where = session.role === 'super_admin' ? {} : { tenantId: session.tenantId! }

  const pessoas = await prisma.pessoa.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: { id: true, nome: true, cpf: true, createdAt: true },
  })
  return NextResponse.json(pessoas)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const tenantId = session.tenantId
  if (!tenantId) return NextResponse.json({ error: 'Sem tenant' }, { status: 403 })

  const { nome, cpf, faceDescriptor } = await req.json()

  if (!nome || !cpf || !faceDescriptor) {
    return NextResponse.json({ message: 'Dados incompletos' }, { status: 400 })
  }

  const cpfLimpo = String(cpf).replace(/\D/g, '')
  if (cpfLimpo.length !== 11) {
    return NextResponse.json({ message: 'CPF inválido' }, { status: 400 })
  }

  const existing = await prisma.pessoa.findUnique({
    where: { tenantId_cpf: { tenantId, cpf: cpfLimpo } },
  })
  if (existing) {
    return NextResponse.json({ message: 'CPF já cadastrado' }, { status: 409 })
  }

  const pessoa = await prisma.pessoa.create({
    data: {
      tenantId,
      nome: String(nome).trim(),
      cpf: cpfLimpo,
      faceDescriptor: JSON.stringify(faceDescriptor),
    },
  })

  return NextResponse.json({ id: pessoa.id, nome: pessoa.nome, cpf: pessoa.cpf }, { status: 201 })
}
