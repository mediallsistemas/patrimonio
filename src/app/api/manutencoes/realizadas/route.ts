import { verifyAuth } from '@/modules/auth/auth.guards'
import { escopoLeitura } from '@/modules/auth/tenant-filter'
import { ok, badRequest, unauthorized, serverError } from '@/lib/api-response'
import { listarRealizadasPorAssets } from '@/modules/manutencoes/manutencoes.service'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'admin_multi', 'operator_patrimonio', 'operator', 'viewer'])
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('assetIds')
  if (!raw) return badRequest('assetIds obrigatório')

  const assetIds = raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n))

  if (assetIds.length === 0) return badRequest('assetIds inválidos')

  try {
    const realizadas = await listarRealizadasPorAssets(assetIds, escopoLeitura(session))
    return ok(realizadas)
  } catch {
    return serverError('listarRealizadasPorAssets failed')
  }
}
