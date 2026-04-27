import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, unauthorized, serverError } from '@/lib/api-response'
import { listarTenantsPublico } from '@/modules/tenants/tenants.service'

export async function GET(req: Request): Promise<Response> {
  try {
    const session = await verifyAuth(req, ['super_admin'])
    if (!session) return unauthorized()

    const tenants = await listarTenantsPublico()

    return ok(
      tenants.map((t) => ({
        id:      t.id,
        slug:    t.slug,
        name:    t.nome,
        logoUrl: t.logoUrl,
        active:  t.ativo,
      })),
    )
  } catch {
    return serverError('listarTenants failed')
  }
}
