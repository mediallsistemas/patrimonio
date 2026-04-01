import { prisma } from '@/lib/db'
import { comparePassword } from '@/lib/auth'

function auditLog(event: string, details: Record<string, unknown>) {
  // Structured audit log — replace with persistent log store (DB/SIEM) as needed
  console.log(JSON.stringify({ audit: true, event, ts: new Date().toISOString(), ...details }))
}

export async function autenticarUsuario(login: string, senha: string, ip?: string) {
  try {
    const input = login.toLowerCase().trim()

    // Tenta por email exato ou username
    const usuario = await prisma.usuario.findFirst({
      where: { OR: [{ email: input }, { username: input }] },
      include: { tenant: true },
    })

    if (!usuario || !usuario.ativo) {
      auditLog('LOGIN_FAILED', { reason: 'user_not_found_or_inactive', login: input, ip })
      return null
    }

    const senhaValida = await comparePassword(senha, usuario.senhaHash)
    if (!senhaValida) {
      auditLog('LOGIN_FAILED', { reason: 'invalid_password', userId: usuario.id, login: input, ip })
      return null
    }

    auditLog('LOGIN_SUCCESS', { userId: usuario.id, login: input, role: usuario.role, ip })
    return usuario
  } catch (error) {
    console.error('[auth.service] autenticarUsuario:', error instanceof Error ? error.message : 'unknown error')
    throw error
  }
}
