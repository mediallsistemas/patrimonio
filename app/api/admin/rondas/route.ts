import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { ok, unauthorized, forbidden, serverError } from '@/lib/api-response'
import { listarRondasAdmin } from '@/modules/rondas/rondas.service'

export async function GET(req: Request): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ['super_admin', 'tenant_admin'])
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session

  const tenantId = session.role === 'tenant_admin' ? session.tenantId! : undefined

  try {
    const rondas = await listarRondasAdmin(100, tenantId)
    return ok(rondas)
  } catch {
    return serverError('listarRondasAdmin failed')
  }
}
