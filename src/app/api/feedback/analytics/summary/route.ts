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

    const filtros = {
      de:    searchParams.get('de')        ?? searchParams.get('startDate') ?? undefined,
      ate:   searchParams.get('ate')       ?? searchParams.get('endDate')   ?? undefined,
      setor: searchParams.get('setor')     ?? searchParams.get('formType')  ?? undefined,
    }

    const summary = await analyticsService.getSummary(tenantId, filtros)

    // Mapeia para o formato da SPA: { total, avgSatisfaction, pctRecomendaria }
    return ok({
      total:              summary.totalRespostas,
      avgSatisfaction:    summary.mediaGeral ?? 0,
      pctRecomendaria:    summary.pctRecomendaria,
      mediaRecomendaria:  summary.mediaRecomendaria,
      porSetor:           summary.porSetor,
    })
  } catch (err) {
    return serverError(err)
  }
}
