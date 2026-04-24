import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, badRequest, unauthorized, serverError } from '@/lib/api-response'

const TOKEN_ENV = process.env.TRILOGO_TOKEN ?? ''
const TRILOGO_BASE = process.env.TRILOGO_BASE_URL ?? 'https://public.api.trilogo.app/api'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'operator_patrimonio'])
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const patrimony = searchParams.get('patrimony')?.trim()
  const companyIdRaw = searchParams.get('companyId')
  const projeto = searchParams.get('projeto')?.trim()

  if (!patrimony) return badRequest('patrimony obrigatório')
  if (!companyIdRaw) return badRequest('companyId obrigatório')

  const companyId = parseInt(companyIdRaw, 10)
  if (isNaN(companyId)) return badRequest('companyId inválido')

  try {
    const res = await fetch(`${TRILOGO_BASE}/asset`, {
      headers: { accept: 'application/json', token: TOKEN_ENV },
      next: { revalidate: 60 },
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

    const found = all.filter(a => {
      if (String(a.companyId) !== String(companyId)) return false
      // busca por patrimônio: substring case-insensitive
      if (!a.patrimony.toLowerCase().includes(patrimony.toLowerCase())) return false
      // se veio projeto, restringe ao projeto (parts[2] do departmentFullAddress)
      if (projeto) {
        const parts = String(a.departmentFullAddress ?? '').split('>').map(s => s.trim())
        if (parts[2] !== projeto) return false
      }
      return true
    })

    return ok(found)
  } catch {
    return serverError('buscar-por-patrimonio failed')
  }
}
