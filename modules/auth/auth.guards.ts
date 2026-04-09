import { verifyToken } from '@/lib/auth'
import { prismaAuth } from '@/lib/db-auth'
import type { JWTPayload } from './auth.types'

type AllowedRole = JWTPayload['role']

/**
 * Verifica autenticação a partir do cookie de sessão ou do header Authorization.
 * Retorna o payload do JWT se válido e o role estiver autorizado, ou null caso contrário.
 */
export async function verifyAuth(
  req: Request,
  allowedRoles?: AllowedRole[]
): Promise<JWTPayload | null> {
  let token: string | undefined

  // Tenta Authorization: Bearer <token> (SPA FeedbackForms usa header)
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  }

  // Fallback: cookie httpOnly (Next.js SSR)
  if (!token) {
    const cookieHeader = req.headers.get('cookie') ?? ''
    const match = cookieHeader.match(/ls_session=([^;]+)/)
    token = match?.[1]
  }

  if (!token) return null

  // verifyToken retorna SessionPayload — mapear para JWTPayload
  const session = await verifyToken(token)
  if (!session) return null

  const payload: JWTPayload = {
    sub:        session.sub,
    email:      session.email,
    nome:       session.nome,
    role:       session.role as JWTPayload['role'],
    tenantId:   session.tenantId,
    tenantSlug: session.tenantSlug,
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(payload.role)) return null
  }

  return payload
}

/**
 * Verifica se o tenant do usuário tem acesso ao sistema solicitado.
 * super_admin sempre passa. Lança erro se o tenant não tiver o sistema habilitado.
 */
export async function assertSistema(
  session: JWTPayload,
  sistema: 'feedbackForms' | 'linenSistem',
): Promise<void> {
  if (session.role === 'super_admin') return

  if (!session.tenantId) return // sem tenant = sem restrição de sistema

  const tenant = await prismaAuth.tenant.findUnique({
    where: { id: session.tenantId },
    select: { [sistema]: true },
  })

  if (!tenant || !tenant[sistema as keyof typeof tenant]) {
    throw new Error(`Sistema ${sistema} não habilitado para este tenant`)
  }
}
