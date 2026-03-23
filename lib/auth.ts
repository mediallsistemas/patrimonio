import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'linensistem-secret-change-in-production'
)
const COOKIE_NAME = 'ls_session'
const EXPIRES_IN  = 60 * 60 * 24 // 24h em segundos

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface SessionPayload {
  sub:        string         // userId — campo padrão JWT, usado pela SPA FeedbackForms
  userId:     string         // mantido por compatibilidade com código existente
  email:      string
  nome:       string
  role:       string         // "super_admin" | "tenant_admin" | "operator"
  tenantId:   string | null
  tenantSlug: string | null
}

// ── JWT ───────────────────────────────────────────────────────────────────────

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRES_IN}s`)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

// ── Cookie ────────────────────────────────────────────────────────────────────

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function setSessionCookie(payload: SessionPayload): Promise<string> {
  const token = await signToken(payload)
  const jar = await cookies()
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   EXPIRES_IN,
    path:     '/',
  })
  return token
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE_NAME)
}

// ── Senha ─────────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ── Cookie name (para middleware que não tem acesso ao módulo completo) ───────

export const SESSION_COOKIE = COOKIE_NAME
