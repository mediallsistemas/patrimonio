import { prisma } from '@/lib/db'
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
    return await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    })
  } catch (error) {
    console.error('[pessoas.service] resolverTenantPorSlug:', error)
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
