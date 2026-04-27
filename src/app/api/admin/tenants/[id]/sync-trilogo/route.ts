import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, forbidden, notFound, serverError } from '@/lib/api-response'
import { prismaAuth } from '@/lib/db-auth'
import { sincronizarTenant } from '@/modules/ambientes/ambientes.service'
import { invalidarCacheBlocos } from '@/lib/blocos-cache'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin'])
  if (!session) return forbidden()

  const { id } = await params

  try {
    const tenant = await prismaAuth.tenant.findUnique({
      where: { id },
      select: { id: true, trilogoCompanyId: true },
    })
    if (!tenant) return notFound('Tenant')
    if (!tenant.trilogoCompanyId) {
      return ok({ message: 'Tenant sem vínculo Trilogo', blocosCriados: 0, ambientesCriados: 0 })
    }

    const result = await sincronizarTenant(id)
    if (!result) return ok({ message: 'Tenant sem vínculo Trilogo', blocosCriados: 0, ambientesCriados: 0 })

    invalidarCacheBlocos(id)

    return ok({
      message: `Sincronizado: ${result.blocosCriados} blocos, ${result.ambientesCriados} ambientes criados`,
      ...result,
    })
  } catch {
    return serverError('sync-trilogo failed')
  }
}
