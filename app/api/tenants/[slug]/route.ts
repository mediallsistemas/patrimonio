import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, unauthorized, notFound, serverError } from '@/lib/api-response'
import { buscarTenantPorSlug } from '@/modules/tenants/tenants.service'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  try {
    const session = await verifyAuth(req)
    if (!session) return unauthorized()

    const { slug } = await params
    const tenant = await buscarTenantPorSlug(slug)
    if (!tenant) return notFound('Tenant')

    return ok({
      id:      tenant.id,
      slug:    tenant.slug,
      name:    tenant.nome,
      logoUrl: tenant.logoUrl,
      active:  tenant.ativo,
    })
  } catch {
    return serverError('buscarTenant failed')
  }
}
