import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, badRequest, forbidden, serverError } from '@/lib/api-response'
import { prisma } from '@/lib/db'

const TOKEN = process.env.TRILOGO_TOKEN ?? ''
const TRILOGO_BASE = process.env.TRILOGO_BASE_URL ?? 'https://public.api.trilogo.app/api'

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

// Cache em memória — evita re-fetch enquanto o servidor está rodando
let cache: { data: Record<string, unknown>[]; at: number } | null = null
let empresasCache: { data: { id: number; nome: string }[]; at: number } | null = null
const TTL = 10 * 60 * 1000 // 10 min
const EMPRESAS_TTL = 30 * 60 * 1000 // 30 min (empresas mudam raramente)

function buildProjetos(all: Record<string, unknown>[], companyId: string): string[] {
  return [...new Set(
    all
      .filter((a) => String(a['companyId']) === companyId)
      .map((a) => String(a['departmentFullAddress'] ?? '').split('>')[2]?.trim())
      .filter((p): p is string => Boolean(p)),
  )].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

function buildEmpresas(all: Record<string, unknown>[]): { id: number; nome: string }[] {
  const map = new Map<number, string>()
  all.forEach((a) => map.set(a['companyId'] as number, String(a['companyName']).trim()))
  return [...map.entries()]
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => {
      const diff = ordemEmpresa(a.nome) - ordemEmpresa(b.nome)
      return diff !== 0 ? diff : a.nome.localeCompare(b.nome, 'pt-BR')
    })
}

async function fetchAll(): Promise<Record<string, unknown>[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.data
  const res = await fetch(`${TRILOGO_BASE}/asset`, {
    headers: { accept: 'application/json', token: TOKEN },
  })
  if (!res.ok) throw new Error('Trílogo assets error')
  const data = (await res.json()) as Record<string, unknown>[]
  cache = { data, at: Date.now() }
  // Atualiza o cache de empresas junto, aproveitando o fetch já feito
  empresasCache = { data: buildEmpresas(data), at: Date.now() }
  return data
}

async function fetchEmpresas(): Promise<{ id: number; nome: string }[]> {
  if (empresasCache && Date.now() - empresasCache.at < EMPRESAS_TTL) return empresasCache.data
  // Cache de empresas expirou mas o de assets ainda é válido — reaproveita
  if (cache && Date.now() - cache.at < TTL) {
    const data = buildEmpresas(cache.data)
    empresasCache = { data, at: Date.now() }
    return data
  }
  // Precisa buscar tudo do zero
  await fetchAll()
  return empresasCache!.data
}

// Pre-warm: inicia o cache assim que o módulo é carregado (no startup do servidor)
if (TOKEN) fetchAll().catch(() => { /* silencioso — próximo request tentará novamente */ })

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'operator_patrimonio'])
  if (!session) return forbidden()

  if (!TOKEN) return serverError('TRILOGO_TOKEN não configurado')

  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')

  try {
    // tenant_admin só pode ver os bens da própria empresa no Trílogo
    if (session.role === 'tenant_admin' || session.role === 'operator_patrimonio') {
      const tenant = await prisma.tenant.findUnique({
        where: { id: session.tenantId! },
        select: { trilogoCompanyId: true },
      })
      if (!tenant?.trilogoCompanyId) return forbidden()

      const allowedCompanyId = String(tenant.trilogoCompanyId)

      // Bloqueia listagem geral de empresas
      if (searchParams.get('only') === 'empresas') return forbidden()

      if (!companyId) return badRequest('companyId obrigatório')
      if (companyId !== allowedCompanyId) return forbidden()

      const all = await fetchAll()
      return ok(all.filter((a) => String(a['companyId']) === allowedCompanyId))
    }

    if (searchParams.get('only') === 'empresas') {
      return ok(await fetchEmpresas())
    }

    if (!companyId) return badRequest('companyId obrigatório')

    if (searchParams.get('only') === 'projetos') {
      const all = await fetchAll()
      return ok(buildProjetos(all, companyId))
    }

    const all = await fetchAll()
    return ok(all.filter((a) => String(a['companyId']) === companyId))
  } catch {
    return serverError('trilogo assets GET failed')
  }
}
