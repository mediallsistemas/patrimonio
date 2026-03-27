import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, forbidden, serverError } from '@/lib/api-response'
import { listarRondasAdmin } from '@/modules/rondas/rondas.service'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
  if (!session) return forbidden()

  const tenantId = session.role === 'tenant_admin' ? session.tenantId! : undefined

  try {
    const rondas = await listarRondasAdmin(100, tenantId)
    return ok(rondas)
  } catch {
    return serverError('listarRondasAdmin failed')
  }
}
