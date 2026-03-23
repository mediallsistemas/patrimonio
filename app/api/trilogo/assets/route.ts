import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, badRequest, forbidden, serverError } from '@/lib/api-response'

const TOKEN = process.env.TRILOGO_TOKEN ?? ''
const TRILOGO_BASE = process.env.TRILOGO_BASE_URL ?? 'https://public.api.trilogo.app/api'

// Cache em memória — evita re-fetch enquanto o servidor está rodando
let cache: { data: Record<string, unknown>[]; at: number } | null = null
const TTL = 10 * 60 * 1000 // 10 min

async function fetchAll(): Promise<Record<string, unknown>[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.data
  const res = await fetch(`${TRILOGO_BASE}/asset`, {
    headers: { accept: 'application/json', token: TOKEN },
  })
  if (!res.ok) throw new Error('Trílogo assets error')
  const data = (await res.json()) as Record<string, unknown>[]
  cache = { data, at: Date.now() }
  return data
}

const ORDEM: string[] = [
  'MINAS GERAIS', 'BRASÍLIA', 'BRASILIA', 'GOIÁS', 'GOIAS', 'ACRE',
  'MATO GROSSO', 'PARÁ', 'PARA', 'KERNHOLZ', 'AMAZONAS',
  'RONDÔNIA', 'RONDONIA', 'LIFE NORTH', 'AMAPÁ', 'AMAPA',
]

function ordemEmpresa(nome: string): number {
  const upper = nome.toUpperCase()
  const idx = ORDEM.findIndex((o) => upper.includes(o))
  return idx === -1 ? ORDEM.length : idx
}

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
  if (!session) return forbidden()

  if (!TOKEN) return serverError('TRILOGO_TOKEN não configurado')

  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')

  try {
    const all = await fetchAll()

    if (searchParams.get('only') === 'empresas') {
      const map = new Map<number, string>()
      all.forEach((a) => map.set(a['companyId'] as number, String(a['companyName']).trim()))

      const empresas = [...map.entries()]
        .map(([id, nome]) => ({ id, nome }))
        .sort((a, b) => {
          const diff = ordemEmpresa(a.nome) - ordemEmpresa(b.nome)
          return diff !== 0 ? diff : a.nome.localeCompare(b.nome, 'pt-BR')
        })

      return ok(empresas)
    }

    if (!companyId) return badRequest('companyId obrigatório')

    const filtrado = all.filter((a) => String(a['companyId']) === companyId)
    return ok(filtrado)
  } catch {
    return serverError('trilogo assets GET failed')
  }
}
