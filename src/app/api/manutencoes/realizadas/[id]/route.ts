import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, unauthorized, notFound, serverError } from '@/lib/api-response'
import { buscarRealizadaComFotos } from '@/modules/manutencoes/manutencoes.service'

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'operator_patrimonio', 'operator', 'viewer'])
  if (!session) return unauthorized()

  const { id } = await ctx.params

  try {
    const m = await buscarRealizadaComFotos(id)
    if (!m) return notFound('manutenção')
    return ok(m)
  } catch {
    return serverError('buscarRealizadaComFotos failed')
  }
}
