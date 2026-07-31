'use client'

import { useEffect } from 'react'
import { setActiveTenantId } from '@/services/active-tenant'

/**
 * Sincroniza a "unidade ativa" do cliente com o tenant da rota atual.
 *
 * Montado em [tenantSlug]/layout (server component resolve slug → tenantId e
 * passa por prop). Mantém o header `x-tenant-id` das chamadas /me/* apontando
 * para a unidade que o usuário está visualizando — essencial para admin_multi,
 * que navega entre várias unidades pelo slug da URL.
 */
export default function ActiveTenantSync({ tenantId }: { tenantId: string }) {
  useEffect(() => {
    setActiveTenantId(tenantId)
  }, [tenantId])

  return null
}
