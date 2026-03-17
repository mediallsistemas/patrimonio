import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params
  const { nome, cpf, faceDescriptor } = await req.json()

  if (!nome || !cpf || !faceDescriptor) {
    return NextResponse.json({ message: 'Dados incompletos' }, { status: 400 })
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) return NextResponse.json({ message: 'Tenant não encontrado' }, { status: 404 })

  const cpfLimpo = String(cpf).replace(/\D/g, '')
  if (cpfLimpo.length !== 11) {
    return NextResponse.json({ message: 'CPF inválido' }, { status: 400 })
  }

  const existing = await prisma.pessoa.findUnique({ where: { tenantId_cpf: { tenantId: tenant.id, cpf: cpfLimpo } } })
  if (existing) {
    return NextResponse.json({ message: 'CPF já cadastrado' }, { status: 409 })
  }

  const pessoa = await prisma.pessoa.create({
    data: { tenantId: tenant.id, nome: String(nome).trim(), cpf: cpfLimpo, faceDescriptor: JSON.stringify(faceDescriptor) },
  })

  return NextResponse.json({ id: pessoa.id, nome: pessoa.nome, cpf: pessoa.cpf }, { status: 201 })
}
