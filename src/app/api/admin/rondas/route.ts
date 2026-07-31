import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { escopoLeitura } from '@/modules/auth/tenant-filter'
import { ok, unauthorized, forbidden, serverError } from '@/lib/api-response'
import { listarRondasAdmin } from '@/modules/rondas/rondas.service'

export async function GET(req: Request): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ['super_admin', 'tenant_admin', 'admin_multi', 'viewer'])
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()

  // super_admin → todas as unidades; demais → as unidades do escopo (1 ou N).
  const escopo = escopoLeitura(auth.session)
  if (!escopo.global && escopo.tenantIds.length === 0) return ok([])

  try {
    const rondas = await listarRondasAdmin(100, undefined, escopo.global ? undefined : escopo.tenantIds)
    return ok(rondas)
  } catch {
    return serverError('listarRondasAdmin failed')
  }
}
