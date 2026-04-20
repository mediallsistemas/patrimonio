import { prismaAuth as prisma } from '@/lib/db-auth'
import { hashPassword } from '@/lib/auth'
import { LINENSISTEM_ROLES } from '@/modules/auth/auth.types'
import type { CreateUsuarioInput, UpdateUsuarioInput } from './usuarios.types'

const SELECT_USUARIO = {
  id: true,
  email: true,
  nome: true,
  role: true,
  ativo: true,
  criadoEm: true,
  tenantId: true,
  sistemas: true,
  tenant: { select: { slug: true, nome: true, id: true } },
} as const

export async function listarUsuarios() {
  try {
    return await prisma.usuario.findMany({
      where: { role: { in: [...LINENSISTEM_ROLES] } },
      orderBy: { criadoEm: 'asc' },
      select: SELECT_USUARIO,
    })
  } catch (error) {
    console.error('[usuarios.service] listarUsuarios:', error)
    throw error
  }
}

export async function listarUsuariosPorTenant(tenantId: string) {
  try {
    return await prisma.usuario.findMany({
      where: { tenantId, role: { in: [...LINENSISTEM_ROLES] } },
      orderBy: { criadoEm: 'asc' },
      select: SELECT_USUARIO,
    })
  } catch (error) {
    console.error('[usuarios.service] listarUsuariosPorTenant:', error)
    throw error
  }
}

export async function buscarUsuario(id: string) {
  try {
    return await prisma.usuario.findUnique({
      where: { id },
      select: SELECT_USUARIO,
    })
  } catch (error) {
    console.error('[usuarios.service] buscarUsuario:', error)
    throw error
  }
}

export async function criarUsuario(input: CreateUsuarioInput) {
  try {
    const email = `${input.username.trim().toLowerCase()}@sistema.local`
    return await prisma.usuario.create({
      data: {
        email,
        nome: input.nome.trim(),
        senhaHash: await hashPassword(input.senha),
        role: input.role,
        tenantId: input.tenantId ?? null,
      },
      select: SELECT_USUARIO,
    })
  } catch (error) {
    console.error('[usuarios.service] criarUsuario:', error)
    throw error
  }
}

export async function atualizarUsuario(id: string, input: UpdateUsuarioInput) {
  try {
    return await prisma.usuario.update({
      where: { id },
      data: {
        ...(input.nome !== undefined && { nome: input.nome.trim() }),
        ...(input.ativo !== undefined && { ativo: input.ativo }),
        ...(input.role !== undefined && { role: input.role }),
      },
      select: SELECT_USUARIO,
    })
  } catch (error) {
    console.error('[usuarios.service] atualizarUsuario:', error)
    throw error
  }
}

export async function deletarUsuario(id: string) {
  try {
    await prisma.usuario.delete({ where: { id } })
  } catch (error) {
    console.error('[usuarios.service] deletarUsuario:', error)
    throw error
  }
}

export async function resetSenhaUsuario(id: string) {
  try {
    const novaSenha = Math.random().toString(36).slice(-10) + 'A1!'
    return await prisma.usuario.update({
      where: { id },
      data: {
        senhaHash: await hashPassword(novaSenha),
        mustChangePassword: true,
      },
      select: { ...SELECT_USUARIO, mustChangePassword: true },
    })
  } catch (error) {
    console.error('[usuarios.service] resetSenhaUsuario:', error)
    throw error
  }
}
