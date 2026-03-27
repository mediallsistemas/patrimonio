import { ok, notFound, serverError } from '@/lib/api-response'
import { buscarLinkAmbiente, listarAgendamentosPorAssets } from '@/modules/links-publicos/links-publicos.service'

const TOKEN_ENV = process.env.TRILOGO_TOKEN ?? ''
const TRILOGO_BASE = process.env.TRILOGO_BASE_URL ?? 'https://public.api.trilogo.app/api'

let assetCache: Map<string, { data: Record<string, unknown>[]; at: number }> = new Map()
const TTL = 10 * 60 * 1000

async function fetchAssetsByCompany(companyId: number): Promise<Record<string, unknown>[]> {
  const key = String(companyId)
  const cached = assetCache.get(key)
  if (cached && Date.now() - cached.at < TTL) return cached.data

  const res = await fetch(`${TRILOGO_BASE}/asset`, {
    headers: { accept: 'application/json', token: TOKEN_ENV },
  })
  if (!res.ok) throw new Error('Trílogo assets error')
  const all = (await res.json()) as Record<string, unknown>[]
  const filtered = all.filter(a => String(a['companyId']) === key)
  assetCache.set(key, { data: filtered, at: Date.now() })
  return filtered
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params

  try {
    const link = await buscarLinkAmbiente(token)
    if (!link) return notFound('Link')

    const todosAssets = await fetchAssetsByCompany(link.companyId)

    // Filtra bens do projeto e ambiente exatos
    const bensDoAmbiente = todosAssets.filter(a => {
      const addr = String(a['departmentFullAddress'] ?? '')
      const parts = addr.split('>').map((s: string) => s.trim())
      const projAsset = parts[2] ?? ''
      const ambAsset  = parts[4] ?? parts[3] ?? ''
      return projAsset === link.projeto && ambAsset === link.ambiente
    })

    const ids = bensDoAmbiente.map(a => Number(a['id']))
    const agendamentos = await listarAgendamentosPorAssets(ids)

    return ok({ link, bens: bensDoAmbiente, agendamentos })
  } catch {
    return serverError('public bem GET failed')
  }
}
