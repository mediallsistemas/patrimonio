import { verifyAuth } from '@/modules/auth/auth.guards'
import { resolveActiveTenantId } from '@/modules/auth/tenant-filter'
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from '@/lib/api-response'
import * as manutencoesService from '@/modules/manutencoes/manutencoes.service'
import { FinalizarManutencaoSchema } from '@/modules/manutencoes/manutencoes.types'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, ['operator', 'operator_patrimonio', 'tenant_admin', 'admin_multi', 'viewer'])
  if (!session) return unauthorized()

  // Unidade ativa (admin_multi opera na unidade do slug atual)
  const tenantId = resolveActiveTenantId(session, req)
  if (!tenantId) return forbidden()

  const { id } = await params
  const parsed = FinalizarManutencaoSchema.safeParse(await req.json())
  if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

  try {
    const data = await manutencoesService.finalizar(tenantId, id, parsed.data)
    if (!data) return notFound('Manutenção')
    return ok(data)
  } catch {
    return serverError('finalizar manutencao failed')
  }
}
