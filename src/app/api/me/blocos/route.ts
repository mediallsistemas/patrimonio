import { verifyAuth } from '@/modules/auth/auth.guards'
import { resolveActiveTenantId } from '@/modules/auth/tenant-filter'
import { ok, forbidden, serverError } from '@/lib/api-response'
import { listarBlocos } from '@/modules/ambientes/ambientes.service'
import { blocosCache, BLOCOS_TTL } from '@/lib/blocos-cache'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'admin_multi', 'viewer', 'operator', 'operator_patrimonio'])
  if (!session) return forbidden()

  // Unidade ativa (admin_multi navega por slug; o header x-tenant-id só é
  // aceito se a sessão tiver acesso ao tenant — ver resolveActiveTenantId).
  const tenantId = resolveActiveTenantId(session, req)

  // super_admin não tem tenant próprio — retorna lista vazia
  if (!tenantId) return ok([])

  try {
    const hit = blocosCache.get(tenantId)
    if (hit && Date.now() - hit.at < BLOCOS_TTL) return ok(hit.data)

    const blocos = await listarBlocos(tenantId)
    blocosCache.set(tenantId, { data: blocos, at: Date.now() })
    return ok(blocos)
  } catch {
    return serverError('listarBlocos failed')
  }
}
