import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, unauthorized, notFound, serverError } from '@/lib/api-response'
import { buscarTenantPorSlug } from '@/modules/tenants/tenants.service'
import { listarTemplates } from '@/modules/feedback/form-template.service'

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

    const templates = await listarTemplates(tenant.id)

    return ok(
      templates.map((t) => ({
        id:       t.id,
        tenantId: t.tenantId,
        slug:     t.id,
        name:     t.nome,
        active:   t.ativo,
        blocks:   t.campos,
      })),
    )
  } catch {
    return serverError('listarTemplates failed')
  }
}
