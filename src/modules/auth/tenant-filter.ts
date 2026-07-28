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

/**
 * Escopo de leitura resolvido a partir da sessão.
 *
 * Existe porque em `tenantFilter` o `null` é ambíguo: significa tanto
 * "super_admin, vê tudo" quanto "sessão sem unidade" — e nos dois casos o
 * filtro sai vazio, ou seja, abre. Aqui os dois casos são tipos distintos e
 * "sem unidade" fecha.
 */
export type EscopoLeitura =
  | { global: true }
  | { global: false; tenantIds: string[] }

export function escopoLeitura(
  session: Pick<JWTPayload, 'role' | 'tenantId' | 'tenantIds'>,
): EscopoLeitura {
  if (session.role === 'super_admin') return { global: true }

  // tenantIds já inclui o tenant principal (montado no login), mas a união
  // deduplicada protege tokens antigos em que só o tenantId veio preenchido.
  const ids = [...new Set(
    [session.tenantId, ...(session.tenantIds ?? [])].filter((id): id is string => !!id),
  )]
  return { global: false, tenantIds: ids }
}

/** Where de tenant a partir do escopo. Sem unidade → não casa com nada. */
export function filtroEscopo(escopo: EscopoLeitura) {
  if (escopo.global) return {}
  if (escopo.tenantIds.length === 0) return { tenantId: { in: [] as string[] } }
  if (escopo.tenantIds.length === 1) return { tenantId: escopo.tenantIds[0] }
  return { tenantId: { in: escopo.tenantIds } }
}
