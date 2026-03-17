import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Rota temporária de diagnóstico — remover após resolver o problema
export async function GET() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, slug: true, nome: true, ativo: true },
  })
  const pessoas = await prisma.pessoa.findMany({
    select: { id: true, nome: true, cpf: true, tenantId: true },
  })
  return NextResponse.json({ tenants, pessoas })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { slug } = body
  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  return NextResponse.json({ slug, tenant })
}
