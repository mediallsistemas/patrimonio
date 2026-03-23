import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, created, badRequest, conflict, forbidden, serverError } from '@/lib/api-response'
import { CreateTenantSchema } from '@/modules/tenants/tenants.types'
import * as tenantsService from '@/modules/tenants/tenants.service'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin'])
  if (!session) return forbidden()

  try {
    const tenants = await tenantsService.listarTenants()
    return ok(tenants)
  } catch {
    return serverError('listarTenants failed')
  }
}

export async function POST(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin'])
  if (!session) return forbidden()

  const parsed = CreateTenantSchema.safeParse(await req.json())
  if (!parsed.success) return badRequest(JSON.stringify(parsed.error.flatten().fieldErrors))

  try {
    const tenant = await tenantsService.criarTenant(parsed.data)
    return created(tenant)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Unique constraint')) return conflict('Slug já em uso')
    return serverError('criarTenant failed')
  }
}
