import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, forbidden, serverError, created, notFound, badRequest } from '@/lib/api-response'
import { buscarTenantPorSlug } from '@/modules/tenants/tenants.service'
import { CreateAmbienteSchema } from '@/modules/ambientes/ambientes.types'
import { listarAmbientes, criarAmbiente } from '@/modules/ambientes/ambientes.service'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
  if (!session) return forbidden()

  const { slug } = await params

  try {
    const tenant = await buscarTenantPorSlug(slug)
    if (!tenant) return notFound('Tenant')

    if (session.role !== 'super_admin' && session.tenantId !== tenant.id) return forbidden()

    const ambientes = await listarAmbientes(tenant.id)
    return ok(ambientes)
  } catch (err) {
    console.error('[tenants/ambientes] GET:', err)
    return serverError('listarAmbientes failed')
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
  if (!session) return forbidden()

  const { slug } = await params

  try {
    const tenant = await buscarTenantPorSlug(slug)
    if (!tenant) return notFound('Tenant')

    if (session.role !== 'super_admin' && session.tenantId !== tenant.id) return forbidden()

    const parsed = CreateAmbienteSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

    const ambiente = await criarAmbiente(tenant.id, parsed.data)
    return created(ambiente)
  } catch (err) {
    console.error('[tenants/ambientes] POST:', err)
    return serverError('criarAmbiente failed')
  }
}
