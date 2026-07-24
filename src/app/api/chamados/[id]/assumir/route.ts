import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { escopoSessao } from '@/modules/auth/tenant-filter'
import { ok, badRequest, unauthorized, forbidden, conflict, serverError } from '@/lib/api-response'
import * as chamadosCommand from '@/modules/chamados/chamados-command.service'
import { AssumirChamadoSchema } from '@/modules/chamados/chamados.types'
import { ROLES_ESCRITA_CHAMADOS } from '@/modules/chamados/chamados.rules'

// Assumir: quem assume vira o responsável. Aceita prioridade opcional
// (o operador define a prioridade ao assumir, direto do painel).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ROLES_ESCRITA_CHAMADOS)
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session
  if (session.role !== 'super_admin' && !session.tenantId) return forbidden()

  const { id } = await ctx.params

  const parsed = AssumirChamadoSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

  try {
    const chamado = await chamadosCommand.assumir(id, escopoSessao(session), session.sub, parsed.data)
    // null = não existe, não é do tenant ou já foi assumido por outro (corrida)
    if (!chamado) return conflict('Chamado indisponível para assumir')
    return ok(chamado)
  } catch {
    return serverError('assumir chamado failed')
  }
}
