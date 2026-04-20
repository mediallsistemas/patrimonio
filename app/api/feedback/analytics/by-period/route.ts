import { NextRequest } from 'next/server'
import { verifyAuth, assertSistema } from '@/modules/auth/auth.guards'
import { resolveTenantId } from '@/modules/auth/tenant-resolver'
import * as analyticsService from '@/modules/feedback/analytics.service'
import { ok, badRequest, unauthorized, serverError } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  try {
    const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
    if (!session) return unauthorized()
    assertSistema(session, 'feedbackforms')

    const { searchParams } = req.nextUrl
    const tenantId = await resolveTenantId(session, searchParams.get('tenantSlug'))
    if (!tenantId) return badRequest('tenantSlug obrigatório para super_admin')

    const agrupamento = searchParams.get('agrupamento') as 'dia' | 'semana' | 'mes' | null
    const filtros = {
      de:          searchParams.get('de')        ?? searchParams.get('startDate') ?? undefined,
      ate:         searchParams.get('ate')       ?? searchParams.get('endDate')   ?? undefined,
      agrupamento: agrupamento ?? 'mes',
    }

    const data = await analyticsService.getByPeriod(tenantId, filtros)

    // Mapeia para o formato da SPA: { mes, respostas }
    return ok(data.map((d) => ({ mes: d.periodo, respostas: d.total, mediaRecomendaria: d.mediaRecomendaria })))
  } catch (err) {
    return serverError(err)
  }
}
