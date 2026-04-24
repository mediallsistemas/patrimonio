import { prismaAuth as prisma } from '@/lib/db-auth'
import type { CreateTenantInput, UpdateTenantInput } from './tenants.types'

export async function buscarTenantPorSlug(slug: string) {
  try {
    return await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, nome: true, logoUrl: true, ativo: true, trilogoCompanyId: true, trilogoProjectName: true, feedbackForms: true },
    })
  } catch (error) {
    console.error('[tenants.service] buscarTenantPorSlug:', error)
    throw error
  }
}

export async function listarTenantsPublico() {
  try {
    return await prisma.tenant.findMany({
      where: { ativo: true },
      select: { id: true, slug: true, nome: true, logoUrl: true, ativo: true, trilogoCompanyId: true, trilogoProjectName: true, feedbackForms: true },
      orderBy: { nome: 'asc' },
    })
  } catch (error) {
    console.error('[tenants.service] listarTenantsPublico:', error)
    throw error
  }
}

export async function listarTenants() {
  try {
    return await prisma.tenant.findMany({
      orderBy: { criadoEm: 'asc' },
      select: {
        id: true,
        slug: true,
        nome: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
        logoUrl: true,
        trilogoCompanyId: true, trilogoProjectName: true,
        feedbackForms: true,
        _count: { select: { usuarios: true, pessoas: true } },
      },
    })
  } catch (error) {
    console.error('[tenants.service] listarTenants:', error)
    throw error
  }
}

export async function buscarTenant(id: string) {
  try {
    return await prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        nome: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
        logoUrl: true,
        _count: { select: { usuarios: true, pessoas: true } },
      },
    })
  } catch (error) {
    console.error('[tenants.service] buscarTenant:', error)
    throw error
  }
}

export async function criarTenant(input: CreateTenantInput) {
  try {
    const slugNorm = input.slug.toLowerCase().trim().replace(/\s+/g, '-')
    return await prisma.tenant.create({
      data: {
        slug: slugNorm,
        nome: input.nome.trim(),
        ...(input.trilogoCompanyId != null && { trilogoCompanyId: input.trilogoCompanyId }),
        ...(input.trilogoProjectName != null && { trilogoProjectName: input.trilogoProjectName }),
      },
      select: { id: true, slug: true, nome: true, ativo: true, criadoEm: true, trilogoCompanyId: true, trilogoProjectName: true },
    })
  } catch (error) {
    console.error('[tenants.service] criarTenant:', error)
    throw error
  }
}

export async function atualizarTenant(id: string, input: UpdateTenantInput) {
  try {
    return await prisma.tenant.update({
      where: { id },
      data: {
        ...(input.nome !== undefined && { nome: input.nome.trim() }),
        ...(input.ativo !== undefined && { ativo: input.ativo }),
        ...(input.trilogoCompanyId !== undefined && { trilogoCompanyId: input.trilogoCompanyId }),
        ...(input.trilogoProjectName !== undefined && { trilogoProjectName: input.trilogoProjectName }),
        ...(input.feedbackForms !== undefined && { feedbackForms: input.feedbackForms }),
      },
      select: { id: true, slug: true, nome: true, ativo: true, atualizadoEm: true, trilogoCompanyId: true, trilogoProjectName: true, feedbackForms: true },
    })
  } catch (error) {
    console.error('[tenants.service] atualizarTenant:', error)
    throw error
  }
}

export async function deletarTenant(id: string) {
  try {
    await prisma.tenant.delete({ where: { id } })
  } catch (error) {
    console.error('[tenants.service] deletarTenant:', error)
    throw error
  }
}
