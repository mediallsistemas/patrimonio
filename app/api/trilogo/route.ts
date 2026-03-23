import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, badRequest, forbidden, serverError } from '@/lib/api-response'

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

  try {
    const res = await fetch(
      `${TRILOGO_BASE}/ticket?startDate=${startDate}&endDate=${endDate}`,
      { headers: { accept: 'application/json', token: TRILOGO_TOKEN } },
    )

    if (!res.ok) return serverError('Erro ao buscar Trílogo')

    const data = (await res.json()) as Record<string, unknown>[]
    const patrimonio = data.filter((t) => t['assetId'] || t['patrimony'])

    return ok(patrimonio)
  } catch {
    return serverError('trilogo GET failed')
  }
}
