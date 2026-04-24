import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, forbidden, serverError } from '@/lib/api-response'
import { prismaAuth } from '@/lib/db-auth'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['tenant_admin', 'super_admin'])
  if (!session || !session.tenantId) return forbidden()

  try {
    const tenant = await prismaAuth.tenant.findUnique({
      where: { id: session.tenantId },
      select: { id: true, slug: true, nome: true, trilogoCompanyId: true, trilogoProjectName: true },
    })
    if (!tenant) return forbidden()
    return ok(tenant)
  } catch {
    return serverError('me/tenant GET failed')
  }
}
