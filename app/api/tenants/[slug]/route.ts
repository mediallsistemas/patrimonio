import { verifyAuth } from '@/modules/auth/auth.guards'
import { prisma } from '@/lib/db'
import { ok, unauthorized, notFound, serverError } from '@/lib/api-response'

interface Params {
  params: Promise<{ slug: string }>
}

// GET /api/tenants/:slug — busca tenant por slug (autenticado)
export async function GET(req: Request, { params }: Params) {
  try {
    const session = await verifyAuth(req)
    if (!session) return unauthorized()

    const { slug } = await params
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, nome: true, logoUrl: true, ativo: true },
    })

    if (!tenant) return notFound('Tenant')

    return ok({
      id:      tenant.id,
      slug:    tenant.slug,
      name:    tenant.nome,
      logoUrl: tenant.logoUrl,
      active:  tenant.ativo,
    })
  } catch (err) {
    return serverError(err)
  }
}
