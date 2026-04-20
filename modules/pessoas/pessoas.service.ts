import { prisma } from '@/lib/db'
import { prismaAuth } from '@/lib/db-auth'
import type { CreatePessoaInput } from './pessoas.types'

export async function listarPessoas(tenantId: string | null) {
  try {
    const where = tenantId ? { tenantId } : {}
    return await prisma.pessoa.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      select: { id: true, nome: true, cpf: true, criadoEm: true, tenantId: true },
    })
  } catch (error) {
    console.error('[pessoas.service] listarPessoas:', error)
    throw error
  }
}

export async function resolverTenantPorSlug(tenantSlug: string) {
  try {
    return await prismaAuth.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    })
  } catch (error) {
    console.error('[pessoas.service] resolverTenantPorSlug:', error)
    throw error
  }
}

/**
 * Retorna apenas os campos necessários para o algoritmo de face matching.
 * Usa select explícito para evitar carregar campos desnecessários (ex: tenantId, atualizadoEm).
 */
export async function buscarPessoasParaFaceMatch(tenantId: string | null): Promise<
  Array<{ id: string; faceDescriptor: string; nome: string; cpf: string; criadoEm: Date }>
> {
  try {
    const where = tenantId ? { tenantId } : {}
    return await prisma.pessoa.findMany({
      where,
      select: { id: true, faceDescriptor: true, nome: true, cpf: true, criadoEm: true },
    })
  } catch (error) {
    console.error('[pessoas.service] buscarPessoasParaFaceMatch:', error)
    throw error
  }
}

export async function buscarPessoa(id: string) {
  try {
    return await prisma.pessoa.findUnique({
      where: { id },
      select: { id: true, nome: true, cpf: true, criadoEm: true },
    })
  } catch (error) {
    console.error('[pessoas.service] buscarPessoa:', error)
    throw error
  }
}

export async function deletarPessoa(id: string) {
  try {
    await prisma.$transaction([
      prisma.movimentacao.deleteMany({ where: { pessoaId: id } }),
      prisma.pessoa.delete({ where: { id } }),
    ])
  } catch (error) {
    console.error('[pessoas.service] deletarPessoa:', error)
    throw error
  }
}

export async function criarPessoa(input: CreatePessoaInput, tenantId: string) {
  try {
    const cpfLimpo = input.cpf.replace(/\D/g, '')

    const existente = await prisma.pessoa.findUnique({
      where: { tenantId_cpf: { tenantId, cpf: cpfLimpo } },
    })
    if (existente) return { conflict: true as const, pessoa: existente }

    const pessoa = await prisma.pessoa.create({
      data: {
        tenantId,
        nome: input.nome.trim(),
        cpf: cpfLimpo,
        faceDescriptor: JSON.stringify(input.faceDescriptor),
      },
    })

    return { conflict: false as const, pessoa }
  } catch (error) {
    console.error('[pessoas.service] criarPessoa:', error)
    throw error
  }
}
