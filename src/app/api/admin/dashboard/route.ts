import { NextRequest } from 'next/server'

import { ok, badRequest, notFound, forbidden, serverError } from '@/lib/api-response'
import { verifyAuth } from '@/modules/auth/auth.guards'
import { buscarTenant } from '@/modules/tenants/tenants.service'
import { getDashboardData } from '@/modules/dashboard/dashboard.service'

export async function GET(req: NextRequest): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin'])
  if (!session) return forbidden()

  const tenantId = new URL(req.url).searchParams.get('tenantId')
  if (!tenantId) return badRequest('tenantId obrigatório')

  const tenant = await buscarTenant(tenantId)
  if (!tenant) return notFound('Tenant')

  try {
    const data = await getDashboardData(tenantId)
    return ok({ tenant: { id: tenant.id, nome: tenant.nome, slug: tenant.slug }, ...data })
  } catch {
    return serverError('getDashboardData failed')
  }
}
