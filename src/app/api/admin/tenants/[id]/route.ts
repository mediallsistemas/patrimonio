import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, noContent, badRequest, forbidden, notFound, serverError } from '@/lib/api-response'
import { UpdateTenantSchema } from '@/modules/tenants/tenants.types'
import * as tenantsService from '@/modules/tenants/tenants.service'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin'])
  if (!session) return forbidden()

  const { id } = await params

  const parsed = UpdateTenantSchema.safeParse(await req.json())
  if (!parsed.success) return badRequest(JSON.stringify(parsed.error.flatten().fieldErrors))

  try {
    const tenant = await tenantsService.atualizarTenant(id, parsed.data)
    return ok(tenant)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Record to update not found')) return notFound('Tenant')
    return serverError('atualizarTenant failed')
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin'])
  if (!session) return forbidden()

  const { id } = await params

  try {
    await tenantsService.deletarTenant(id)
    return noContent()
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Record to delete does not exist')) return notFound('Tenant')
    return serverError('deletarTenant failed')
  }
}
