import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, badRequest, forbidden, serverError } from '@/lib/api-response'
import { listarBlocos } from '@/modules/ambientes/ambientes.service'
import { z } from 'zod'

// Blocos/ambientes de um tenant específico — usado pelo super_admin ao abrir
// um chamado (ele não tem tenant próprio, então informa o tenant alvo).
// Diferente de /api/me/blocos, que é escopado pelo tenant da sessão.
const QuerySchema = z.object({ tenantId: z.string().uuid('tenantId inválido') })

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin'])
  if (!session) return forbidden()

  const url = new URL(req.url)
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

  try {
    const blocos = await listarBlocos(parsed.data.tenantId)
    return ok(blocos)
  } catch {
    return serverError('listarBlocos (admin) failed')
  }
}
