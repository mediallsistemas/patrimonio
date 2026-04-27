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
      de:  searchParams.get('de')  ?? searchParams.get('startDate') ?? undefined,
      ate: searchParams.get('ate') ?? searchParams.get('endDate')   ?? undefined,
    }

    const data = await analyticsService.getByDepartment(tenantId, filtros)

    // Mapeia para o formato da SPA: { formType, value, count }
    return ok(data.map((d) => ({
      formType:         d.setor,
      value:            d.mediaRecomendaria ?? 0,
      count:            d.total,
    })))
  } catch (err) {
    return serverError(err)
  }
}
