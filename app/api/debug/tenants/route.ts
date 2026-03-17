import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Rota temporária de diagnóstico — remover após resolver o problema
export async function GET() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, slug: true, nome: true, ativo: true },
  })
  const pessoas = await prisma.pessoa.count()
  return NextResponse.json({ tenants, totalPessoas: pessoas })
}
