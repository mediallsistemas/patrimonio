import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { ok, unauthorized, forbidden, notFound, serverError } from '@/lib/api-response'
import * as chamadosQuery from '@/modules/chamados/chamados-query.service'
import { ROLES_LEITURA_CHAMADOS } from '@/modules/chamados/chamados.rules'

// Fotos do chamado (abertura + execução), carregadas sob demanda —
// as listas nunca incluem base64 (padrão FotoLazy do projeto).
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ROLES_LEITURA_CHAMADOS)
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session
  if (session.role !== 'super_admin' && !session.tenantId) return forbidden()

  const { id } = await ctx.params

  try {
    const escopo = {
      tenantId: session.role === 'super_admin' ? null : session.tenantId,
      tenantIds: session.tenantIds,
    }
    const fotos = await chamadosQuery.buscarFotos(id, escopo)
    if (!fotos) return notFound('chamado')
    return ok(fotos)
  } catch {
    return serverError('buscar fotos failed')
  }
}
