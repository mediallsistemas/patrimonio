import { verifyAuth } from '@/modules/auth/auth.guards'
import { prisma } from '@/lib/db'
import { ok, unauthorized, notFound, serverError } from '@/lib/api-response'

interface Params {
  params: Promise<{ slug: string }>
}

// GET /api/tenants/:slug/form-templates — lista templates do tenant
export async function GET(req: Request, { params }: Params) {
  try {
    const session = await verifyAuth(req)
    if (!session) return unauthorized()

    const { slug } = await params
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!tenant) return notFound('Tenant')

    const templates = await prisma.templateFormulario.findMany({
      where: { tenantId: tenant.id, ativo: true },
      orderBy: { criadoEm: 'desc' },
    })

    return ok(templates.map((t) => ({
      id:       t.id,
      tenantId: t.tenantId,
      slug:     t.id,         // usa id como slug — SPA usa este campo para lookup
      name:     t.nome,
      active:   t.ativo,
      blocks:   t.campos,     // JSON armazenado no campo campos
    })))
  } catch (err) {
    return serverError(err)
  }
}
