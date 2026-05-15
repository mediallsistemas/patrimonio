import { prismaAuth } from '@/lib/db-auth'

const TRILOGO_TOKEN = process.env.TRILOGO_TOKEN ?? ''
const TRILOGO_BASE = process.env.TRILOGO_BASE_URL ?? 'https://public.api.trilogo.app/api'

// Cache por "companyId:projectName" — 10 min TTL.
// Mesma estratégia de bens-tenant antiga; centralizada aqui para evitar duplicação.
const cache = new Map<string, { data: BemTrilogo[]; at: number }>()
const TTL = 10 * 60 * 1000

export interface BemTrilogo {
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
}

export async function listarBensDoTenant(tenantId: string): Promise<BemTrilogo[]> {
  const tenant = await prismaAuth.tenant.findUnique({
    where: { id: tenantId },
    select: { trilogoCompanyId: true, trilogoProjectName: true },
  })
  if (!tenant?.trilogoCompanyId) return []
  if (!TRILOGO_TOKEN) throw new Error('TRILOGO_TOKEN não configurado')

  return fetchBensParaUnidade(tenant.trilogoCompanyId, tenant.trilogoProjectName)
}

async function fetchBensParaUnidade(
  companyId: number,
  projectName: string | null,
): Promise<BemTrilogo[]> {
  const cacheKey = `${companyId}:${projectName ?? ''}`
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.at < TTL) return hit.data

  const res = await fetch(`${TRILOGO_BASE}/asset`, {
    headers: { accept: 'application/json', token: TRILOGO_TOKEN },
  })
  if (!res.ok) throw new Error('Trilogo assets error')

  const all = (await res.json()) as BemTrilogo[]

  const filtered = all.filter((a) => {
    if (Number(a.companyId) !== companyId) return false
    if (!projectName) return true
    const addr = String(a.departmentFullAddress ?? '').toUpperCase()
    return addr.includes(projectName.toUpperCase())
  })

  cache.set(cacheKey, { data: filtered, at: Date.now() })
  return filtered
}

// Filtra bens do tenant por bloco (seg[3]) e ambiente (seg[4]) do departmentFullAddress.
// Se não houver match, retorna a lista completa para evitar tela vazia.
export function filtrarPorAmbiente(
  bens: BemTrilogo[],
  ambiente: string | null,
  bloco: string | null,
): BemTrilogo[] {
  if (!ambiente && !bloco) return bens

  const ambUpper = (ambiente ?? '').toUpperCase()
  const blocoUpper = (bloco ?? '').toUpperCase()

  const filtered = bens.filter((a) => {
    const segs = String(a.departmentFullAddress ?? '')
      .split('>')
      .map((s) => s.trim().toUpperCase())
    const segBloco = segs[3] ?? ''
    const segAmbiente = segs[4] ?? ''

    const blocoMatch =
      !blocoUpper || segBloco.includes(blocoUpper) || blocoUpper.includes(segBloco)
    const ambienteMatch =
      !ambUpper || segAmbiente.includes(ambUpper) || ambUpper.includes(segAmbiente)

    return blocoMatch && ambienteMatch
  })

  return filtered.length > 0 ? filtered : bens
}

export function buscarPorPatrimonio(bens: BemTrilogo[], patrimony: string): BemTrilogo[] {
  const q = patrimony.trim().toLowerCase()
  if (!q) return []
  return bens.filter((a) => a.patrimony.toLowerCase().includes(q))
}
