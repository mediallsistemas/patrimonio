import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, forbidden, notFound, serverError } from '@/lib/api-response'
import { buscarTenantPorSlug } from '@/modules/tenants/tenants.service'
import { listarBlocos } from '@/modules/ambientes/ambientes.service'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'operator', 'operator_patrimonio'])
  if (!session) return forbidden()

  const { slug } = await params

  try {
    const tenant = await buscarTenantPorSlug(slug)
    if (!tenant) return notFound('Tenant')

    if (session.role !== 'super_admin' && session.tenantId !== tenant.id) return forbidden()

    const blocos = await listarBlocos(tenant.id)
    return ok(blocos)
  } catch {
    return serverError('listarBlocos failed')
  }
}
