import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from '@/lib/api-response'
import * as chamadosCommand from '@/modules/chamados/chamados-command.service'
import { AtribuirChamadoSchema } from '@/modules/chamados/chamados.types'
import { ROLES_ADMIN_CHAMADOS } from '@/modules/chamados/chamados.rules'

// Atribuir chamado a um usuário — exclusivo de admin.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ROLES_ADMIN_CHAMADOS)
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session

  const { id } = await ctx.params

  const parsed = AtribuirChamadoSchema.safeParse(await req.json())
  if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

  try {
    const escopo = {
      tenantId: session.role === 'super_admin' ? null : session.tenantId,
      tenantIds: session.tenantIds,
    }
    const chamado = await chamadosCommand.atribuir(id, escopo, session.sub, parsed.data)
    if (!chamado) return notFound('chamado ou responsável')
    return ok(chamado)
  } catch {
    return serverError('atribuir chamado failed')
  }
}
