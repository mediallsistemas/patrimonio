'use client'

import { useParams } from 'next/navigation'
import { useAuth } from './useAuth'

/**
 * Retorna o tenantSlug da URL e valida que o usuário pertence ao tenant.
 * Super admin pode acessar qualquer tenant via URL.
 */
export function useTenant() {
  const params = useParams()
  const { user, isLoading } = useAuth()

  const tenantSlugFromUrl = typeof params?.tenantSlug === 'string' ? params.tenantSlug : null

  const isAuthorized =
    !isLoading &&
    user !== null &&
    (user.role === 'super_admin' || user.tenantSlug === tenantSlugFromUrl)

  return {
    tenantSlug: tenantSlugFromUrl,
    tenantId: user?.tenantId ?? null,
    isAuthorized,
    isLoading,
  }
}
