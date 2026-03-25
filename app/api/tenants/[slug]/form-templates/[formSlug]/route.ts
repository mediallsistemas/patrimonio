import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, unauthorized, notFound, serverError } from '@/lib/api-response'
import { buscarTenantPorSlug } from '@/modules/tenants/tenants.service'
import { buscarTemplate } from '@/modules/feedback/form-template.service'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string; formSlug: string }> },
): Promise<Response> {
  try {
    const session = await verifyAuth(req)
    if (!session) return unauthorized()

    const { slug, formSlug } = await params
    const tenant = await buscarTenantPorSlug(slug)
    if (!tenant) return notFound('Tenant')

    // formSlug is the UUID id of the template
    const template = await buscarTemplate(formSlug, tenant.id)
    if (!template) return notFound('Template')

    return ok({
      id:       template.id,
      tenantId: template.tenantId,
      slug:     template.id,
      name:     template.nome,
      active:   template.ativo,
      blocks:   template.campos,
    })
  } catch {
    return serverError('buscarTemplate failed')
  }
}
