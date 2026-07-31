import { verifyAuth } from '@/modules/auth/auth.guards'
import { resolveActiveTenantId } from '@/modules/auth/tenant-filter'
import { ok, forbidden, serverError } from '@/lib/api-response'
import { prismaAuth } from '@/lib/db-auth'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['tenant_admin', 'super_admin', 'admin_multi', 'viewer'])
  if (!session) return forbidden()

  // Unidade ativa: admin_multi opera na unidade do header x-tenant-id (validado);
  // demais caem no tenantId primário da sessão.
  const tenantId = resolveActiveTenantId(session, req)
  if (!tenantId) return forbidden()

  try {
    const tenant = await prismaAuth.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, slug: true, nome: true, trilogoCompanyId: true, trilogoProjectName: true },
    })
    if (!tenant) return forbidden()
    return ok(tenant)
  } catch {
    return serverError('me/tenant GET failed')
  }
}
