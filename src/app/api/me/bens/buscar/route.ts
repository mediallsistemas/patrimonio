import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, badRequest, unauthorized, forbidden, serverError } from '@/lib/api-response'
import { listarBensDoTenant, buscarPorPatrimonio } from '@/modules/bens/bens.service'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['operator', 'operator_patrimonio', 'tenant_admin'])
  if (!session) return unauthorized()
  if (!session.tenantId) return forbidden()

  const { searchParams } = new URL(req.url)
  const patrimony = searchParams.get('patrimony')?.trim()
  if (!patrimony) return badRequest('patrimony obrigatório')

  try {
    const bens = await listarBensDoTenant(session.tenantId)
    return ok(buscarPorPatrimonio(bens, patrimony))
  } catch {
    return serverError('buscar bem failed')
  }
}
