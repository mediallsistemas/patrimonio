import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0))
}

const THRESHOLD = 0.5

export async function POST(req: NextRequest) {
  const body = await req.json()
  const descriptor: number[] = body.descriptor
  const tenantSlug: string | undefined = body.tenantSlug

  if (!descriptor || !Array.isArray(descriptor)) {
    return NextResponse.json({ message: 'Descriptor ausente ou inválido' }, { status: 400 })
  }
  if (descriptor.length !== 128) {
    return NextResponse.json({ message: `Descriptor com tamanho incorreto: ${descriptor.length} (esperado 128)` }, { status: 400 })
  }

  let tenantId: string | undefined
  if (tenantSlug) {
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    if (!tenant) return NextResponse.json({ message: 'Tenant não encontrado' }, { status: 404 })
    tenantId = tenant.id
  }

  const pessoas = await prisma.pessoa.findMany({
    where: tenantId ? { tenantId } : undefined,
  })

  let melhorMatch: (typeof pessoas)[0] | null = null
  let menorDistancia = Infinity

  for (const pessoa of pessoas) {
    const stored = JSON.parse(pessoa.faceDescriptor) as number[]
    const dist = euclideanDistance(descriptor, stored)
    if (dist < THRESHOLD && dist < menorDistancia) {
      menorDistancia = dist
      melhorMatch = pessoa
    }
  }

  if (!melhorMatch) {
    return NextResponse.json({ encontrado: false })
  }

  const retiradas = await prisma.movimentacao.count({
    where: { pessoaId: melhorMatch.id, tipo: 'retirada' },
  })
  const devolucoes = await prisma.movimentacao.count({
    where: { pessoaId: melhorMatch.id, tipo: 'devolucao' },
  })

  return NextResponse.json({
    encontrado: true,
    pessoa: {
      id: melhorMatch.id,
      nome: melhorMatch.nome,
      cpf: melhorMatch.cpf,
      created_at: melhorMatch.createdAt,
    },
    pendentes: retiradas - devolucoes,
  })
}
