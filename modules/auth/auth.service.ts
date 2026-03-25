import { prisma } from '@/lib/db'
import { comparePassword } from '@/lib/auth'

export async function autenticarUsuario(email: string, senha: string) {
  try {
    // Suporta login por username (sem @) ou email completo
    const lookup = email.toLowerCase().includes('@')
      ? email.toLowerCase()
      : `${email.toLowerCase()}@sistema.local`

    const usuario = await prisma.usuario.findUnique({
      where: { email: lookup },
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
