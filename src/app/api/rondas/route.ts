import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { resolveActiveTenantId } from '@/modules/auth/tenant-filter'
import { ok, created, conflict, unauthorized, forbidden, serverError } from '@/lib/api-response'
import { listarRondas, criarRonda, expirarRondasAbertas } from '@/modules/rondas/rondas.service'

export async function GET(req: Request): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ['super_admin', 'tenant_admin', 'admin_multi', 'viewer', 'operator'])
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session

  // Unidade ativa: admin_multi opera na unidade do slug atual (header validado).
  // Não passamos tenantIds — a lista aqui é da unidade, não a soma das unidades.
  const tenantId = session.role === 'super_admin' ? null : resolveActiveTenantId(session, req)
  if (session.role !== 'super_admin' && !tenantId) return forbidden()
  // operators see only their own rondas
  const criadoPorId = session.role === 'operator' ? session.sub : undefined

  try {
    // Fecha rondas abertas há mais de 24h antes de retornar a lista
    await expirarRondasAbertas().catch(() => {})
    const rondas = await listarRondas(tenantId, 50, criadoPorId)
    return ok(rondas)
  } catch {
    return serverError('listarRondas failed')
  }
}

export async function POST(req: Request): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ['tenant_admin', 'admin_multi', 'viewer', 'operator'])
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session

  const tenantId = resolveActiveTenantId(session, req)
  if (!tenantId) return forbidden()

  try {
    const result = await criarRonda(tenantId, session.sub)
    if ('conflict' in result) {
      return conflict('Você já possui uma ronda em andamento. Finalize-a antes de iniciar outra.')
    }
    return created(result)
  } catch {
    return serverError('criarRonda failed')
  }
}
