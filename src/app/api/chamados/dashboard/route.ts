import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { escopoSessao } from '@/modules/auth/tenant-filter'
import { ok, badRequest, unauthorized, forbidden, serverError } from '@/lib/api-response'
import { z } from 'zod'

import * as chamadosQuery from '@/modules/chamados/chamados-query.service'
import { ROLES_ADMIN_CHAMADOS } from '@/modules/chamados/chamados.rules'

const PeriodoSchema = z.object({
  de: z.coerce.date().optional(),
  ate: z.coerce.date().optional(),
  // Unidade escolhida no filtro — restringe dentro do escopo, nunca amplia.
  tenantId: z.string().uuid().optional(),
})

// Painel gerencial de chamados — exclusivo de admin (inclui valor gasto).
export async function GET(req: Request): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ROLES_ADMIN_CHAMADOS)
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session
  if (session.role !== 'super_admin' && !session.tenantId) return forbidden()

  const url = new URL(req.url)
  const parsed = PeriodoSchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

  try {
    const { tenantId, ...periodo } = parsed.data
    const dados = await chamadosQuery.dashboard(escopoSessao(session), periodo, tenantId)
    return ok(dados)
  } catch {
    return serverError('dashboard chamados failed')
  }
}
