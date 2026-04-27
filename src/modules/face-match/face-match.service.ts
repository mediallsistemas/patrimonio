import { prisma } from '@/lib/db'
import type { PessoaFace } from './face-match.types'

const THRESHOLD = 0.6

export function euclideanDistance(a: readonly number[], b: readonly number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

/**
 * Busca a melhor correspondência de rosto entre uma lista de pessoas.
 * Retorna null se nenhuma pessoa ficou abaixo do threshold de distância.
 */
export function encontrarMelhorMatch(
  descriptor: readonly number[],
  pessoas: readonly PessoaFace[],
  threshold = THRESHOLD,
): PessoaFace | null {
  let melhorMatch: PessoaFace | null = null
  let menorDistancia = Infinity

  for (const pessoa of pessoas) {
    let stored: number[]
    try {
      stored = JSON.parse(pessoa.faceDescriptor) as number[]
    } catch {
      console.warn(`[face-match.service] faceDescriptor inválido para pessoa ${pessoa.id}`)
      continue
    }

    const dist = euclideanDistance(descriptor, stored)
    if (dist < threshold && dist < menorDistancia) {
      menorDistancia = dist
      melhorMatch = pessoa
    }
  }

  return melhorMatch
}

/**
 * Conta quantas retiradas pendentes (sem devolução) uma pessoa tem.
 * Usa groupBy em uma única query, ao invés de dois count() separados.
 */
export async function buscarPendentes(
  pessoaId: string,
  tenantId?: string,
): Promise<number> {
  try {
    const where = tenantId
      ? { pessoaId, tenantId }
      : { pessoaId }

    const grupos = await prisma.movimentacao.groupBy({
      by: ['tipo'],
      where,
      _count: { id: true },
    })

    const retiradas = grupos.find((g) => g.tipo === 'retirada')?._count.id ?? 0
    const devolucoes = grupos.find((g) => g.tipo === 'devolucao')?._count.id ?? 0
    return Math.max(0, retiradas - devolucoes)
  } catch (error) {
    console.error('[face-match.service] buscarPendentes:', error)
    throw error
  }
}
