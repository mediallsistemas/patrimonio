import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, forbidden, serverError } from '@/lib/api-response'
import { prisma } from '@/lib/db'

const TOKEN = process.env.TRILOGO_TOKEN ?? ''
const TRILOGO_BASE = process.env.TRILOGO_BASE_URL ?? 'https://public.api.trilogo.app/api'

// Cache keyed by "companyId:projectName" (10 min TTL)
const cache = new Map<string, { data: Record<string, unknown>[]; at: number }>()
const TTL = 10 * 60 * 1000

// Cache keyed by "companyId:projectName" — stores ALL assets for the project (10 min TTL)
// Ambiente filtering is done at request time (no need to cache per-room)
async function fetchBensParaUnidade(
  companyId: number,
  projectName: string | null,
): Promise<Record<string, unknown>[]> {
  const cacheKey = `${companyId}:${projectName ?? ''}`
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.at < TTL) return hit.data

  const res = await fetch(`${TRILOGO_BASE}/asset`, {
    headers: { accept: 'application/json', token: TOKEN },
  })
  if (!res.ok) throw new Error('Trilogo assets error')

  const all = (await res.json()) as Record<string, unknown>[]

  const filtered = all.filter((a) => {
    if (Number(a['companyId']) !== companyId) return false
    if (!projectName) return true
    const addr = String(a['departmentFullAddress'] ?? '').toUpperCase()
    return addr.includes(projectName.toUpperCase())
  })

  cache.set(cacheKey, { data: filtered, at: Date.now() })
  return filtered
}

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'operator'])
  if (!session) return forbidden()

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId! },
      select: { trilogoCompanyId: true, trilogoProjectName: true },
    })

    if (!tenant?.trilogoCompanyId) return ok([])
    if (!TOKEN) return serverError('TRILOGO_TOKEN não configurado')

    const { searchParams } = new URL(req.url)
    const ambiente = searchParams.get('ambiente') // e.g. "47 - Repouso 01"
    const bloco    = searchParams.get('bloco')    // e.g. "Bloco Conforto"

    let bens = await fetchBensParaUnidade(tenant.trilogoCompanyId, tenant.trilogoProjectName)

    // Filter by bloco (seg[3]) + ambiente (seg[4]) — fall back to full project list if no match
    if (ambiente || bloco) {
      const ambUpper   = (ambiente ?? '').toUpperCase()
      const blocoUpper = (bloco ?? '').toUpperCase()

      const filtered = bens.filter((a) => {
        const segs = String(a['departmentFullAddress'] ?? '').split('>').map((s) => s.trim().toUpperCase())
        const segBloco    = segs[3] ?? ''
        const segAmbiente = segs[4] ?? ''

        const blocoMatch    = !blocoUpper  || segBloco.includes(blocoUpper)    || blocoUpper.includes(segBloco)
        const ambienteMatch = !ambUpper    || segAmbiente.includes(ambUpper)   || ambUpper.includes(segAmbiente)

        return blocoMatch && ambienteMatch
      })

      bens = filtered.length > 0 ? filtered : bens
    }

    return ok(bens)
  } catch {
    return serverError('bens-tenant GET failed')
  }
}
