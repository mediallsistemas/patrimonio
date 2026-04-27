import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, unauthorized } from '@/lib/api-response'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'operator', 'operator_patrimonio', 'operator_forms', 'viewer'])
  if (!session) return unauthorized()
  return ok(session)
}
