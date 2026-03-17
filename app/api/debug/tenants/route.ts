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

  // Testa verificação facial com threshold progressivo
  if (body.descriptor && body.pessoaId) {
    const { descriptor, pessoaId } = body
    const pessoa = await prisma.pessoa.findUnique({ where: { id: pessoaId } })
    if (!pessoa) return NextResponse.json({ error: 'Pessoa não encontrada' })

    const stored = JSON.parse(pessoa.faceDescriptor) as number[]
    const dist = Math.sqrt(descriptor.reduce((sum: number, val: number, i: number) => sum + Math.pow(val - stored[i], 2), 0))

    return NextResponse.json({
      pessoaNome: pessoa.nome,
      distancia: dist,
      threshold_0_5: dist < 0.5,
      threshold_0_6: dist < 0.6,
      threshold_0_7: dist < 0.7,
      descriptorSalvoTamanho: stored.length,
      descriptorEnviadoTamanho: descriptor.length,
    })
  }

  const { slug } = body
  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  return NextResponse.json({ slug, tenant })
}
