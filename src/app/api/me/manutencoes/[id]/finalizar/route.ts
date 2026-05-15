import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from '@/lib/api-response'
import * as manutencoesService from '@/modules/manutencoes/manutencoes.service'
import { FinalizarManutencaoSchema } from '@/modules/manutencoes/manutencoes.types'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, ['operator', 'operator_patrimonio', 'tenant_admin'])
  if (!session) return unauthorized()
  if (!session.tenantId) return forbidden()

  const { id } = await params
  const parsed = FinalizarManutencaoSchema.safeParse(await req.json())
  if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

  try {
    const data = await manutencoesService.finalizar(session.tenantId, session.sub, id, parsed.data)
    if (!data) return notFound('Manutenção')
    return ok(data)
  } catch {
    return serverError('finalizar manutencao failed')
  }
}
