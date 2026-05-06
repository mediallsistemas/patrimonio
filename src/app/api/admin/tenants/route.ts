import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, created, badRequest, conflict, forbidden, serverError } from '@/lib/api-response'
import { CreateTenantSchema } from '@/modules/tenants/tenants.types'
import * as tenantsService from '@/modules/tenants/tenants.service'
import { sincronizarAmbientesTrilogo } from '@/modules/ambientes/ambientes.service'
import { prisma } from '@/lib/db'

const TOKEN = process.env.TRILOGO_TOKEN ?? ''
const TRILOGO_BASE = process.env.TRILOGO_BASE_URL ?? 'https://public.api.trilogo.app/api'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'viewer'])
  if (!session) return forbidden()

  try {
    if (session.role === 'viewer') {
      const ids = session.tenantIds ?? (session.tenantId ? [session.tenantId] : [])
      const tenants = await prisma.tenant.findMany({
        where: { id: { in: ids } },
        select: { id: true, slug: true, nome: true },
      })
      return ok(tenants)
    }
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

    // Sincronizar blocos/ambientes do Trilogo em background (não bloqueia resposta)
    if (tenant.trilogoCompanyId && TOKEN) {
      void (async () => {
        try {
          const res = await fetch(`${TRILOGO_BASE}/asset`, {
            headers: { accept: 'application/json', token: TOKEN },
          })
          if (!res.ok) return
          const all = (await res.json()) as Record<string, unknown>[]
          const assets = all.filter((a) => {
            if (Number(a['companyId']) !== tenant.trilogoCompanyId) return false
            if (!tenant.trilogoProjectName) return true
            return String(a['departmentFullAddress'] ?? '')
              .toUpperCase()
              .includes(tenant.trilogoProjectName.toUpperCase())
          })
          await sincronizarAmbientesTrilogo(tenant.id, assets)
        } catch {
          // sync falhou silenciosamente — pode ser refeito via /sync-trilogo
        }
      })()
    }

    return created(tenant)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Unique constraint')) return conflict('Slug já em uso')
    return serverError('criarTenant failed')
  }
}
