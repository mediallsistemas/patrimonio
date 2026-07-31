import { verifyAuth } from '@/modules/auth/auth.guards'
import { allowedTenantIds } from '@/modules/auth/tenant-filter'
import { ok, badRequest, forbidden, serverError } from '@/lib/api-response'
import { prismaAuth } from '@/lib/db-auth'
import { visivelPara, type VinculoTrilogo } from '@/modules/trilogo/escopo'

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
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'admin_multi', 'operator_patrimonio', 'viewer'])
  if (!session) return forbidden()

  if (!TOKEN) return serverError('TRILOGO_TOKEN não configurado')

  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')

  try {
    // admin_multi/viewer: podem ter múltiplos tenants — valida que o companyId pedido está entre os seus
    if (session.role === 'admin_multi' || session.role === 'viewer') {
      const tenantIds = allowedTenantIds(session)
      if (tenantIds.length === 0) return forbidden()

      const tenants = await prismaAuth.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { slug: true, nome: true, trilogoCompanyId: true, trilogoProjectName: true },
      })
      const vinculos: VinculoTrilogo[] = tenants
        .filter((t) => t.trilogoCompanyId !== null)
        .map((t) => ({
          trilogoCompanyId: t.trilogoCompanyId!,
          trilogoProjectName: t.trilogoProjectName,
          slug: t.slug,
          nome: t.nome,
        }))

      if (vinculos.length === 0) return forbidden()
      if (searchParams.get('only') === 'empresas') return forbidden()
      if (!companyId) return badRequest('companyId obrigatório')
      if (!vinculos.some((v) => String(v.trilogoCompanyId) === companyId)) return forbidden()

      // Filtra pelas unidades do usuário, não pela empresa inteira: uma empresa
      // agrupa vários hospitais, e um viewer de duas unidades não deve enxergar
      // os bens das outras que dividem o mesmo companyId.
      const all = await fetchAll()
      return ok(all.filter((a) => visivelPara(a, vinculos)))
    }

    // tenant_admin e operator_patrimonio: restritos à empresa do próprio tenant
    if (session.role !== 'super_admin') {
      if (!session.tenantId) return forbidden()

      const tenant = await prismaAuth.tenant.findUnique({
        where: { id: session.tenantId },
        select: { slug: true, nome: true, trilogoCompanyId: true, trilogoProjectName: true },
      })
      if (!tenant?.trilogoCompanyId) return forbidden()

      const vinculo: VinculoTrilogo = {
        trilogoCompanyId: tenant.trilogoCompanyId,
        trilogoProjectName: tenant.trilogoProjectName,
        slug: tenant.slug,
        nome: tenant.nome,
      }

      if (searchParams.get('only') === 'empresas') return forbidden()
      if (!companyId) return badRequest('companyId obrigatório')
      if (companyId !== String(tenant.trilogoCompanyId)) return forbidden()

      // Só os bens da unidade. Antes vinham os da empresa inteira — no Amapá
      // isso significa o admin do HRPG vendo os bens da UEI e da UPA Zona Sul.
      const all = await fetchAll()
      return ok(all.filter((a) => visivelPara(a, [vinculo])))
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
