import { verifyAuth } from '@/modules/auth/auth.guards'
import { resolveActiveTenantId } from '@/modules/auth/tenant-filter'
import { ok, badRequest, unauthorized, forbidden, serverError } from '@/lib/api-response'
import { listarBensDoTenant, buscarPorPatrimonio } from '@/modules/bens/bens.service'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['operator', 'operator_patrimonio', 'tenant_admin', 'admin_multi', 'viewer'])
  if (!session) return unauthorized()

  // Unidade ativa (admin_multi opera na unidade do slug atual)
  const tenantId = resolveActiveTenantId(session, req)
  if (!tenantId) return forbidden()

  const { searchParams } = new URL(req.url)
  const patrimony = searchParams.get('patrimony')?.trim()
  if (!patrimony) return badRequest('patrimony obrigatório')

  try {
    const bens = await listarBensDoTenant(tenantId)
    return ok(buscarPorPatrimonio(bens, patrimony))
  } catch {
    return serverError('buscar bem failed')
  }
}
