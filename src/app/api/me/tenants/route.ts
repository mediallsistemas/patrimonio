import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, forbidden, serverError } from '@/lib/api-response'
import { prismaAuth } from '@/lib/db-auth'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['tenant_admin', 'viewer'])
  if (!session) return forbidden()

  try {
    const tenantIds =
      session.tenantIds && session.tenantIds.length > 0
        ? session.tenantIds
        : session.tenantId
          ? [session.tenantId]
          : []

    if (tenantIds.length === 0) return forbidden()

    const tenants = await prismaAuth.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, slug: true, nome: true, trilogoCompanyId: true, trilogoProjectName: true },
    })

    return ok(tenants)
  } catch {
    return serverError('me/tenants GET failed')
  }
}
