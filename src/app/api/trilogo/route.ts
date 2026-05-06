import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, badRequest, forbidden, serverError } from '@/lib/api-response'
import { prismaAuth } from '@/lib/db-auth'

const TRILOGO_TOKEN = process.env.TRILOGO_TOKEN ?? ''
const TRILOGO_BASE = process.env.TRILOGO_BASE_URL ?? 'https://public.api.trilogo.app/api'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'operator_patrimonio', 'viewer'])
  if (!session) return forbidden()

  if (!TRILOGO_TOKEN) return serverError('TRILOGO_TOKEN não configurado')

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate') ?? '2024-01-01'
  const endDate = searchParams.get('endDate') ?? new Date().toISOString().slice(0, 10)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return badRequest('startDate e endDate devem estar no formato YYYY-MM-DD')
  }

  // viewer: filtra pelos projetos de todos os seus tenants vinculados
  // tenant_admin / operator_patrimonio: filtra pelo próprio tenant
  let allowedProjects: { companyId: number; projectName: string | null }[] = []

  if (session.role !== 'super_admin') {
    const tenantIds =
      session.tenantIds && session.tenantIds.length > 0
        ? session.tenantIds
        : session.tenantId
          ? [session.tenantId]
          : []

    if (tenantIds.length === 0) return forbidden()

    const tenants = await prismaAuth.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { trilogoCompanyId: true, trilogoProjectName: true },
    })

    allowedProjects = tenants
      .filter((t) => t.trilogoCompanyId !== null)
      .map((t) => ({ companyId: t.trilogoCompanyId!, projectName: t.trilogoProjectName ?? null }))

    if (allowedProjects.length === 0) return forbidden()
  }

  try {
    const res = await fetch(
      `${TRILOGO_BASE}/ticket?startDate=${startDate}&endDate=${endDate}`,
      { headers: { accept: 'application/json', token: TRILOGO_TOKEN } },
    )

    if (!res.ok) return serverError('Erro ao buscar Trílogo')

    const data = (await res.json()) as Record<string, unknown>[]
    let patrimonio = data.filter((t) => t['assetId'] || t['patrimony'])

    if (allowedProjects.length > 0) {
      patrimonio = patrimonio.filter((t) => {
        const companyId = Number(t['companyId'])
        const addr = String(t['departmentFullAddress'] ?? '').toUpperCase()
        return allowedProjects.some(({ companyId: cid, projectName }) => {
          if (companyId !== cid) return false
          if (!projectName) return true
          return addr.includes(projectName.toUpperCase())
        })
      })
    }

    return ok(patrimonio)
  } catch {
    return serverError('trilogo GET failed')
  }
}
