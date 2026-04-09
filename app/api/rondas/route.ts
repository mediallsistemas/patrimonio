import { verifyAuthDetailed, assertSistema } from '@/modules/auth/auth.guards'
import { ok, created, unauthorized, forbidden, serverError } from '@/lib/api-response'
import { listarRondas, criarRonda } from '@/modules/rondas/rondas.service'

export async function GET(req: Request): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ['super_admin', 'tenant_admin', 'operator'])
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session
  assertSistema(session, 'linensistem')

  const tenantId = session.role === 'super_admin' ? null : session.tenantId!
  // operators see only their own rondas
  const criadoPorId = session.role === 'operator' ? session.sub : undefined

  try {
    const rondas = await listarRondas(tenantId, 50, criadoPorId)
    return ok(rondas)
  } catch {
    return serverError('listarRondas failed')
  }
}

export async function POST(req: Request): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ['super_admin', 'tenant_admin', 'operator'])
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session

  // super_admin usa tenant de demo; em produção deve receber tenantId no contexto
  const tenantId =
    session.role === 'super_admin'
      ? '00000000-0000-0000-0000-000000000001'
      : session.tenantId!

  try {
    const ronda = await criarRonda(tenantId, session.sub)
    return created(ronda)
  } catch {
    return serverError('criarRonda failed')
  }
}
