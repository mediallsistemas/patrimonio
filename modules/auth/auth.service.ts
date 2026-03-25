import { prisma } from '@/lib/db'
import { comparePassword } from '@/lib/auth'

export async function autenticarUsuario(email: string, senha: string) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
      include: { tenant: true },
    })
    if (!usuario || !usuario.ativo) return null

    const senhaValida = await comparePassword(senha, usuario.senhaHash)
    if (!senhaValida) return null

    return usuario
  } catch (error) {
    console.error('[auth.service] autenticarUsuario:', error)
    throw error
  }
}
