import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, forbidden, serverError } from '@/lib/api-response'
import { listarBlocos } from '@/modules/ambientes/ambientes.service'
import { blocosCache, BLOCOS_TTL } from '@/lib/blocos-cache'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'operator'])
  if (!session) return forbidden()

  // super_admin não tem tenant próprio — retorna lista vazia
  if (!session.tenantId) return ok([])

  try {
    const hit = blocosCache.get(session.tenantId)
    if (hit && Date.now() - hit.at < BLOCOS_TTL) return ok(hit.data)

    const blocos = await listarBlocos(session.tenantId)
    blocosCache.set(session.tenantId, { data: blocos, at: Date.now() })
    return ok(blocos)
  } catch {
    return serverError('listarBlocos failed')
  }
}
