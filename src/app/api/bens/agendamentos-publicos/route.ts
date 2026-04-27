import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, badRequest, unauthorized, serverError } from '@/lib/api-response'
import { listarAgendamentosPorAssets } from '@/modules/links-publicos/links-publicos.service'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'operator_patrimonio', 'operator'])
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('assetIds')
  if (!raw) return badRequest('assetIds obrigatório')

  const assetIds = raw
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n))

  if (assetIds.length === 0) return badRequest('assetIds inválidos')

  try {
    const agendamentos = await listarAgendamentosPorAssets(assetIds)
    return ok(agendamentos)
  } catch {
    return serverError('listarAgendamentosPorAssets failed')
  }
}
