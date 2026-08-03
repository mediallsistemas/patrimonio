import { verifyAuth } from '@/modules/auth/auth.guards'
import { canScopeTenant } from '@/modules/auth/tenant-filter'
import { ok, badRequest, forbidden, serverError } from '@/lib/api-response'
import { listarBlocos } from '@/modules/ambientes/ambientes.service'
import { TenantIdSchema } from '@/modules/tenants/tenants.types'
import { z } from 'zod'

// Blocos/ambientes de um tenant específico — usado ao abrir um chamado pelo
// painel admin informando o tenant alvo (super_admin qualquer um; tenant_admin
// e admin_multi apenas os que administram — canScopeTenant valida).
// Diferente de /api/me/blocos, que é escopado pelo tenant da sessão.
const QuerySchema = z.object({ tenantId: TenantIdSchema })

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'admin_multi', 'viewer'])
  if (!session) return forbidden()

  const url = new URL(req.url)
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

  // Não-super só consulta unidades que administra
  if (!canScopeTenant(session, parsed.data.tenantId)) return forbidden()

  try {
    const blocos = await listarBlocos(parsed.data.tenantId)
    return ok(blocos)
  } catch {
    return serverError('listarBlocos (admin) failed')
  }
}
