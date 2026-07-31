import type { JWTPayload } from './auth.types'

type TenantFilterInput = Pick<JWTPayload, 'tenantId' | 'tenantIds'>

export function tenantFilter(session: TenantFilterInput) {
  const ids = session.tenantIds
  // > 0 (e não > 1): com 1 único id o `in` é equivalente à igualdade, e cobre o
  // caso de sessão multi-unidade cujo tenantId primário veio null — antes isso
  // caía no fallback e abria o filtro (cross-tenant).
  if (ids && ids.length > 0) {
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

type TenantScopeInput = Pick<JWTPayload, 'role' | 'tenantId' | 'tenantIds'>

/**
 * Lista de tenants que a sessão pode acessar: para admin_multi/viewer é
 * `tenantIds` (primário + extras); para os demais, apenas o `tenantId`.
 * super_admin sem tenant → array vazio (escopo cross-tenant tratado à parte).
 */
export function allowedTenantIds(session: TenantScopeInput): string[] {
  if (session.tenantIds && session.tenantIds.length > 0) return session.tenantIds
  return session.tenantId ? [session.tenantId] : []
}

/**
 * `true` se a sessão pode agir sobre o tenant informado.
 * super_admin pode tudo; demais precisam ter o tenant entre os permitidos.
 */
export function canScopeTenant(session: TenantScopeInput, tenantId: string): boolean {
  if (session.role === 'super_admin') return true
  return allowedTenantIds(session).includes(tenantId)
}

/**
 * Resolve a "unidade ativa" de uma request `/me/*`.
 *
 * Lê o header `x-tenant-id` (unidade ativa escolhida no cliente, derivada do
 * slug da URL — ver services/active-tenant.ts). Se presente e a sessão tiver
 * acesso a ele, usa-o; caso contrário cai no `tenantId` primário da sessão.
 * super_admin sem tenant → null.
 *
 * Isso permite que um admin_multi opere em qualquer uma de suas unidades sem
 * vazar para usuários comuns: para estes o header é ignorado se não for o seu
 * próprio tenant.
 *
 * Não confundir com `resolveTenantId` de tenant-resolver.ts (resolve por
 * tenantSlug em query param — usado pelas rotas do FeedbackForms SPA).
 */
export function resolveActiveTenantId(session: TenantScopeInput, req: Request): string | null {
  const requested = req.headers.get('x-tenant-id')?.trim()
  if (requested && canScopeTenant(session, requested)) return requested
  return session.tenantId ?? null
}
