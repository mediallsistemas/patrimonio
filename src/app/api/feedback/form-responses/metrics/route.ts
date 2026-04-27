import { NextRequest } from 'next/server'
import { verifyAuth } from '@/modules/auth/auth.guards'
import { resolveTenantId } from '@/modules/auth/tenant-resolver'
import { ok, badRequest, unauthorized, serverError } from '@/lib/api-response'
import { buscarMetricas } from '@/modules/feedback/form-response.service'

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
    if (!session) return unauthorized()

    const { searchParams } = req.nextUrl
    const tenantId = await resolveTenantId(session, searchParams.get('tenantSlug'))
    if (!tenantId) return badRequest('tenantSlug obrigatório para super_admin')

    const metricas = await buscarMetricas(tenantId, {
      startDate: searchParams.get('startDate'),
      endDate:   searchParams.get('endDate'),
      formType:  searchParams.get('formType'),
    })

    return ok(metricas)
  } catch {
    return serverError('buscarMetricas failed')
  }
}
