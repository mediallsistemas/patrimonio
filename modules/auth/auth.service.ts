import { prisma } from '@/lib/db'
import { comparePassword } from '@/lib/auth'

export async function autenticarUsuario(email: string, senha: string) {
  try {
    const input = email.toLowerCase().trim()

    // Tenta por email exato primeiro
    let usuario = await prisma.usuario.findUnique({
      where: { email: input },
      include: { tenant: true },
    })

    // Se não achou e não tem @, tenta username@sistema.local
    if (!usuario && !input.includes('@')) {
      usuario = await prisma.usuario.findUnique({
        where: { email: `${input}@sistema.local` },
        include: { tenant: true },
      })
    }

    // Se ainda não achou e não tem @, tenta pela parte antes do @ de emails existentes
    if (!usuario && !input.includes('@')) {
      usuario = await prisma.usuario.findFirst({
        where: { email: { startsWith: `${input}@` } },
        include: { tenant: true },
      })
    }
    if (!usuario || !usuario.ativo) return null

    const senhaValida = await comparePassword(senha, usuario.senhaHash)
    if (!senhaValida) return null

    return usuario
  } catch (error) {
    console.error('[auth.service] autenticarUsuario:', error)
    throw error
  }
}
