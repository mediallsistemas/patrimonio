import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { ok, unauthorized, forbidden, serverError } from '@/lib/api-response'
import { listarHistorico } from '@/modules/manutencoes/manutencoes.service'

export async function GET(req: Request): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ['super_admin', 'tenant_admin', 'operator', 'operator_patrimonio', 'viewer'])
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session

  const tenantId = session.role === 'super_admin' ? null : session.tenantId!

  try {
    const manutencoes = await listarHistorico(tenantId, session.tenantIds)
    return ok(manutencoes)
  } catch {
    return serverError('listarHistorico failed')
  }
}
