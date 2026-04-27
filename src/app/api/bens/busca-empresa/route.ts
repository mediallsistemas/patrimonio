import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, badRequest, unauthorized, serverError } from '@/lib/api-response'

const TOKEN_ENV = process.env.TRILOGO_TOKEN ?? ''
const TRILOGO_BASE = process.env.TRILOGO_BASE_URL ?? 'https://public.api.trilogo.app/api'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'operator_patrimonio', 'operator'])
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const companyIdRaw = searchParams.get('companyId')
  if (!companyIdRaw) return badRequest('companyId obrigatório')

  const companyId = parseInt(companyIdRaw, 10)
  if (isNaN(companyId)) return badRequest('companyId inválido')

  try {
    const res = await fetch(`${TRILOGO_BASE}/asset`, {
      headers: { accept: 'application/json', token: TOKEN_ENV },
      next: { revalidate: 600 },
    })
    if (!res.ok) return serverError('Trilogo API indisponível')

    const all = (await res.json()) as Array<{
      id: number
      patrimony: string
      description: string
      brand: string | null
      model: string | null
      serialNumber: string | null
      departmentFullAddress: string
      status: number
      assetTypeName: string
      companyId: number
      companyName: string
      coverPermalink: string | null
    }>

    const bens = all.filter(a => String(a.companyId) === String(companyId))
    return ok(bens)
  } catch {
    return serverError('busca-empresa failed')
  }
}
