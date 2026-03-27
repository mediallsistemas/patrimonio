import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, badRequest, forbidden, serverError } from '@/lib/api-response'
import { prisma } from '@/lib/db'

const TRILOGO_TOKEN = process.env.TRILOGO_TOKEN ?? ''
const TRILOGO_BASE = process.env.TRILOGO_BASE_URL ?? 'https://public.api.trilogo.app/api'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
  if (!session) return forbidden()

  if (!TRILOGO_TOKEN) return serverError('TRILOGO_TOKEN não configurado')

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate') ?? '2024-01-01'
  const endDate = searchParams.get('endDate') ?? new Date().toISOString().slice(0, 10)

  // Validação básica de formato de data
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return badRequest('startDate e endDate devem estar no formato YYYY-MM-DD')
  }

  // tenant_admin só vê tickets da própria empresa/projeto
  let tenantCompanyId: number | null = null
  let tenantProjectName: string | null = null
  if (session.role === 'tenant_admin') {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId! },
      select: { trilogoCompanyId: true, trilogoProjectName: true },
    })
    if (!tenant?.trilogoCompanyId) return forbidden()
    tenantCompanyId = tenant.trilogoCompanyId
    tenantProjectName = tenant.trilogoProjectName ?? null
  }

  try {
    const res = await fetch(
      `${TRILOGO_BASE}/ticket?startDate=${startDate}&endDate=${endDate}`,
      { headers: { accept: 'application/json', token: TRILOGO_TOKEN } },
    )

    if (!res.ok) return serverError('Erro ao buscar Trílogo')

    const data = (await res.json()) as Record<string, unknown>[]
    let patrimonio = data.filter((t) => t['assetId'] || t['patrimony'])

    if (tenantCompanyId !== null) {
      patrimonio = patrimonio.filter((t) => {
        if (Number(t['companyId']) !== tenantCompanyId) return false
        if (!tenantProjectName) return true
        const addr = String(t['departmentFullAddress'] ?? '').toUpperCase()
        return addr.includes(tenantProjectName.toUpperCase())
      })
    }

    return ok(patrimonio)
  } catch {
    return serverError('trilogo GET failed')
  }
}
