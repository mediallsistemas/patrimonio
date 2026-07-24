import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { escopoSessao } from '@/modules/auth/tenant-filter'
import { ok, badRequest, unauthorized, forbidden, conflict, serverError } from '@/lib/api-response'
import * as chamadosCommand from '@/modules/chamados/chamados-command.service'
import { CancelarChamadoSchema } from '@/modules/chamados/chamados.types'
import { ROLES_ADMIN_CHAMADOS } from '@/modules/chamados/chamados.rules'

// Cancelar chamado — exclusivo de admin. Motivo é opcional.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ROLES_ADMIN_CHAMADOS)
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session
  if (session.role !== 'super_admin' && !session.tenantId) return forbidden()

  const { id } = await ctx.params

  const parsed = CancelarChamadoSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

  try {
    const chamado = await chamadosCommand.cancelar(id, escopoSessao(session), session.sub, parsed.data.motivo)
    if (!chamado) return conflict('Chamado já finalizado ou cancelado')
    return ok(chamado)
  } catch {
    return serverError('cancelar chamado failed')
  }
}
