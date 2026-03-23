import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, forbidden, serverError } from '@/lib/api-response'
import { listarRondasAdmin } from '@/modules/rondas/rondas.service'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin'])
  if (!session) return forbidden()

  try {
    const rondas = await listarRondasAdmin()
    return ok(rondas)
  } catch {
    return serverError('listarRondasAdmin failed')
  }
}
