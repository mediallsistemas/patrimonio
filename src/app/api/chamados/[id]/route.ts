import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { escopoSessao } from '@/modules/auth/tenant-filter'
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from '@/lib/api-response'
import * as chamadosQuery from '@/modules/chamados/chamados-query.service'
import * as chamadosCommand from '@/modules/chamados/chamados-command.service'
import { EditarFiscalSchema } from '@/modules/chamados/chamados.types'
import {
  ROLES_LEITURA_CHAMADOS,
  ROLES_ADMIN_CHAMADOS,
} from '@/modules/chamados/chamados.rules'

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ROLES_LEITURA_CHAMADOS)
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session
  if (session.role !== 'super_admin' && !session.tenantId) return forbidden()

  const { id } = await ctx.params

  try {
    const chamado = await chamadosQuery.buscar(id, escopoSessao(session), session.role)
    if (!chamado) return notFound('chamado')
    return ok(chamado)
  } catch {
    return serverError('buscar chamado failed')
  }
}

// PATCH — campos fiscais (fornecedor, nº ordem de compra, valor gasto).
// Exclusivo de admin: outros roles nem passam do guard.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ROLES_ADMIN_CHAMADOS)
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session
  if (session.role !== 'super_admin' && !session.tenantId) return forbidden()

  const { id } = await ctx.params

  const parsed = EditarFiscalSchema.safeParse(await req.json())
  if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

  try {
    const chamado = await chamadosCommand.editarFiscal(id, escopoSessao(session), session.sub, parsed.data)
    if (!chamado) return notFound('chamado')
    return ok(chamado)
  } catch {
    return serverError('editar fiscal failed')
  }
}
