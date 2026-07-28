import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, badRequest, forbidden, serverError } from '@/lib/api-response'
import { prismaAuth } from '@/lib/db-auth'
import { visivelPara, type VinculoTrilogo } from '@/modules/trilogo/escopo'

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
  let vinculos: VinculoTrilogo[] = []

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
      select: { slug: true, nome: true, trilogoCompanyId: true, trilogoProjectName: true },
    })

    vinculos = tenants
      .filter((t) => t.trilogoCompanyId !== null)
      .map((t) => ({
        trilogoCompanyId: t.trilogoCompanyId!,
        trilogoProjectName: t.trilogoProjectName,
        slug: t.slug,
        nome: t.nome,
      }))

    if (vinculos.length === 0) return forbidden()
  }

  try {
    const res = await fetch(
      `${TRILOGO_BASE}/ticket?startDate=${startDate}&endDate=${endDate}`,
      { headers: { accept: 'application/json', token: TRILOGO_TOKEN } },
    )

    if (!res.ok) return serverError('Erro ao buscar Trílogo')

    const data = (await res.json()) as Record<string, unknown>[]
    let patrimonio = data.filter((t) => t['assetId'] || t['patrimony'])

    // Recorte por unidade. Antes, tenant sem projeto configurado passava por
    // `return true` e enxergava todos os bens da empresa; agora vale a mesma
    // regra da importação, que fecha quando nada identifica a unidade.
    if (vinculos.length > 0) {
      patrimonio = patrimonio.filter((t) => visivelPara(t, vinculos))
    }

    return ok(patrimonio)
  } catch {
    return serverError('trilogo GET failed')
  }
}
