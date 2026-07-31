import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { resolveActiveTenantId } from '@/modules/auth/tenant-filter'
import { ok, unauthorized, forbidden, serverError } from '@/lib/api-response'
import { listarBensDoTenant, filtrarPorAmbiente } from '@/modules/bens/bens.service'

export async function GET(req: Request): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ['super_admin', 'tenant_admin', 'admin_multi', 'viewer', 'operator', 'operator_patrimonio'])
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session

  // Unidade ativa (admin_multi opera na unidade do slug atual)
  const tenantId = resolveActiveTenantId(session, req)
  if (!tenantId) return forbidden()

  try {
    const bens = await listarBensDoTenant(tenantId)
    const { searchParams } = new URL(req.url)
    const ambiente = searchParams.get('ambiente')
    const bloco = searchParams.get('bloco')

    return ok(filtrarPorAmbiente(bens, ambiente, bloco))
  } catch {
    return serverError('bens-tenant GET failed')
  }
}
