import { verifyToken } from '@/lib/auth'
import type { JWTPayload } from './auth.types'

type AllowedRole = JWTPayload['role']

export type AuthResult =
  | { ok: true; session: JWTPayload }
  | { ok: false; reason: 'unauthenticated' | 'forbidden' }

export async function verifyAuth(
  req: Request,
  allowedRoles?: AllowedRole[]
): Promise<JWTPayload | null> {
  let token: string | undefined

  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  }

  if (!token) {
    const cookieHeader = req.headers.get('cookie') ?? ''
    const match = cookieHeader.match(/ls_session=([^;]+)/)
    token = match?.[1]
  }

  if (!token) return null

  const session = await verifyToken(token)
  if (!session) return null

  const payload: JWTPayload = {
    sub:        session.sub,
    email:      session.email,
    nome:       session.nome,
    role:       session.role as JWTPayload['role'],
    tenantId:   session.tenantId,
    tenantSlug: session.tenantSlug,
    sistemas:   session.sistemas ?? [],
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(payload.role)) return null
  }

  return payload
}

export async function verifyAuthDetailed(
  req: Request,
  allowedRoles?: AllowedRole[]
): Promise<AuthResult> {
  let token: string | undefined

  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7)

  if (!token) {
    const cookieHeader = req.headers.get('cookie') ?? ''
    const match = cookieHeader.match(/ls_session=([^;]+)/)
    token = match?.[1]
  }

  if (!token) return { ok: false, reason: 'unauthenticated' }

  const session = await verifyToken(token)
  if (!session) return { ok: false, reason: 'unauthenticated' }

  const payload: JWTPayload = {
    sub:        session.sub,
    email:      session.email,
    nome:       session.nome,
    role:       session.role as JWTPayload['role'],
    tenantId:   session.tenantId,
    tenantSlug: session.tenantSlug,
    sistemas:   session.sistemas ?? [],
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(payload.role)) return { ok: false, reason: 'forbidden' }
  }

  return { ok: true, session: payload }
}

/**
 * Verifica se o usuário tem acesso ao sistema solicitado via sistemas[] do JWT.
 * super_admin sempre passa. Tokens antigos sem sistemas[] também passam (gracioso).
 */
export function assertSistema(
  session: JWTPayload,
  sistema: 'feedbackforms' | 'linensistem',
): void {
  if (session.role === 'super_admin') return
  if (!session.sistemas || session.sistemas.length === 0) return
  if (!session.sistemas.includes(sistema)) {
    throw new Error(`Sistema ${sistema} não habilitado para este usuário`)
  }
}
