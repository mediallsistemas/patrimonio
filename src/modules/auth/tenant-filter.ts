import type { JWTPayload } from './auth.types'

type TenantFilterInput = Pick<JWTPayload, 'tenantId' | 'tenantIds'>

export function tenantFilter(session: TenantFilterInput) {
  const ids = session.tenantIds
  if (ids && ids.length > 1) {
    return { tenantId: { in: ids } }
  }
  return session.tenantId ? { tenantId: session.tenantId } : {}
}

// Escopo de tenant derivado da sessão, para passar aos services.
// super_admin → tenantId null (cross-tenant); demais roles → o próprio tenant.
// Único ponto onde essa regra vive — nunca reconstruir inline nas rotas.
export function escopoSessao(
  session: Pick<JWTPayload, 'role' | 'tenantId' | 'tenantIds'>,
): { tenantId: string | null; tenantIds?: string[] } {
  return {
    tenantId: session.role === 'super_admin' ? null : session.tenantId,
    tenantIds: session.tenantIds,
  }
}
