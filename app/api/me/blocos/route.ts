import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, forbidden, serverError } from '@/lib/api-response'
import { listarBlocos } from '@/modules/ambientes/ambientes.service'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'operator'])
  if (!session) return forbidden()

  // super_admin não tem tenant próprio — retorna lista vazia
  if (!session.tenantId) return ok([])

  try {
    const blocos = await listarBlocos(session.tenantId)
    return ok(blocos)
  } catch {
    return serverError('listarBlocos failed')
  }
}
