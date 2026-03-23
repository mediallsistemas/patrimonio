import { verifyAuth } from '@/modules/auth/auth.guards'
import { prisma } from '@/lib/db'
import { ok, unauthorized, notFound, serverError } from '@/lib/api-response'

interface Params {
  params: Promise<{ slug: string; formSlug: string }>
}

// GET /api/tenants/:slug/form-templates/:formSlug
export async function GET(req: Request, { params }: Params) {
  try {
    const session = await verifyAuth(req)
    if (!session) return unauthorized()

    const { slug, formSlug } = await params
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!tenant) return notFound('Tenant')

    // formSlug pode ser o id UUID do template
    const template = await prisma.templateFormulario.findFirst({
      where: { tenantId: tenant.id, id: formSlug },
    })
    if (!template) return notFound('Template')

    return ok({
      id:       template.id,
      tenantId: template.tenantId,
      slug:     template.id,
      name:     template.nome,
      active:   template.ativo,
      blocks:   template.campos,
    })
  } catch (err) {
    return serverError(err)
  }
}
