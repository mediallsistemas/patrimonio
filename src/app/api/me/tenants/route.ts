import { verifyAuth } from '@/modules/auth/auth.guards'
import { allowedTenantIds } from '@/modules/auth/tenant-filter'
import { ok, forbidden, serverError } from '@/lib/api-response'
import { prismaAuth } from '@/lib/db-auth'

const SELECT = { id: true, slug: true, nome: true, trilogoCompanyId: true, trilogoProjectName: true }

/**
 * Unidades que o usuário logado administra — fonte canônica dos seletores de
 * unidade no cliente (UnitSelector, filtros de página, modal de criar usuário).
 * super_admin → todas as ativas; admin_multi/viewer → tenantIds; tenant_admin → a sua.
 */
export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'admin_multi', 'viewer'])
  if (!session) return forbidden()

  try {
    if (session.role === 'super_admin') {
      const tenants = await prismaAuth.tenant.findMany({
        where: { ativo: true },
        select: SELECT,
        orderBy: { nome: 'asc' },
      })
      return ok(tenants)
    }

    const tenantIds = allowedTenantIds(session)
    if (tenantIds.length === 0) return forbidden()

    const tenants = await prismaAuth.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: SELECT,
      orderBy: { nome: 'asc' },
    })

    return ok(tenants)
  } catch {
    return serverError('me/tenants GET failed')
  }
}
