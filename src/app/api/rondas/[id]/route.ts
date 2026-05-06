import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { ok, unauthorized, forbidden, notFound, serverError } from '@/lib/api-response'
import { finalizarRonda } from '@/modules/rondas/rondas.service'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ['super_admin', 'tenant_admin', 'operator'])
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session

  const { id } = await params
  const tenantId = session.role === 'super_admin' ? null : session.tenantId!

  try {
    const ronda = await finalizarRonda(id, tenantId, session.tenantIds)
    if (!ronda) return notFound('Ronda')
    return ok(ronda)
  } catch {
    return serverError('finalizarRonda failed')
  }
}
