import type { JWTPayload } from './auth.types'

type TenantFilterInput = Pick<JWTPayload, 'tenantId' | 'tenantIds'>

export function tenantFilter(session: TenantFilterInput) {
  const ids = session.tenantIds
  if (ids && ids.length > 1) {
    return { tenantId: { in: ids } }
  }
  return session.tenantId ? { tenantId: session.tenantId } : {}
}
