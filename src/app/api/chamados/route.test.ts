import { describe, it, expect, vi, beforeEach } from 'vitest'

// A rota de criação decide o tenant alvo: super_admin usa o corpo (tenant
// validado como ativo), admin_multi só pode usar o corpo dentro do próprio
// escopo (canScopeTenant — fora dele é 403, nunca fallback silencioso) e os
// demais roles têm o corpo ignorado em favor do tenant da sessão. Estes testes
// travam essa regra — o bug anterior era o corpo ser ignorado também para o
// admin_multi, criando o chamado na unidade primária errada.

const criar = vi.fn()
const buscarTenant = vi.fn()
let sessao: Record<string, unknown> | null = null

vi.mock('@/modules/auth/auth.guards', () => ({
  verifyAuthDetailed: async (_req: Request, roles?: string[]) => {
    if (!sessao) return { ok: false, reason: 'unauthenticated' }
    if (roles && !roles.includes(sessao.role as string)) {
      return { ok: false, reason: 'forbidden' }
    }
    return { ok: true, session: sessao }
  },
}))
vi.mock('@/modules/chamados/chamados-command.service', () => ({
  criar: (...args: unknown[]) => criar(...args),
}))
vi.mock('@/modules/chamados/chamados-query.service', () => ({
  listar: vi.fn(),
}))
vi.mock('@/modules/tenants/tenants.service', () => ({
  buscarTenant: (id: string) => buscarTenant(id),
}))

const UEI = '11111111-1111-4111-8111-111111111111'
// Id artesanal legado real da hrpg — NÃO é UUID RFC válido (versão 0).
// Fica aqui de propósito: trava a regressão do Zod 4 rejeitar esse formato
// (o bug era 400 em qualquer operação mirando a hrpg).
const HRPG = '00000000-0000-0000-0000-000000000001'
const FORA_DO_ESCOPO = '33333333-3333-4333-8333-333333333333'
const AMBIENTE = '44444444-4444-4444-8444-444444444444'

function sessaoDe(role: string, extra: Record<string, unknown> = {}) {
  return {
    sub: 'user-1',
    email: 'x@x.com',
    nome: 'Teste',
    role,
    tenantId: UEI,
    tenantSlug: 'uei',
    sistemas: ['linensistem'],
    ...extra,
  }
}

function reqCriar(body: Record<string, unknown>) {
  return new Request('http://localhost/api/chamados', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function corpo(extra: Record<string, unknown> = {}) {
  return {
    titulo: 'Descarga quebrada',
    descricao: 'Vazando sem parar',
    tipo: 'eletrica',
    prazo: '2026-12-31T23:59:59.000Z',
    ambienteId: AMBIENTE,
    ...extra,
  }
}

async function carregarRota() {
  vi.resetModules()
  return await import('./route')
}

beforeEach(() => {
  vi.clearAllMocks()
  sessao = null
  criar.mockResolvedValue({ id: 'ch-1', numero: 123 })
  buscarTenant.mockResolvedValue({ id: HRPG, ativo: true })
})

describe('POST /api/chamados — tenant alvo', () => {
  it('super_admin cria no tenant informado no corpo', async () => {
    sessao = sessaoDe('super_admin', { tenantId: null, tenantSlug: null })
    const { POST } = await carregarRota()
    const res = await POST(reqCriar(corpo({ tenantId: HRPG })))
    expect(res.status).toBe(201)
    expect(criar).toHaveBeenCalledWith(HRPG, 'user-1', expect.anything(), undefined)
  })

  it('super_admin sem tenantId no corpo recebe 400', async () => {
    sessao = sessaoDe('super_admin', { tenantId: null, tenantSlug: null })
    const { POST } = await carregarRota()
    const res = await POST(reqCriar(corpo()))
    expect(res.status).toBe(400)
    expect(criar).not.toHaveBeenCalled()
  })

  it('admin_multi cria em unidade extra que administra (corpo honrado)', async () => {
    sessao = sessaoDe('admin_multi', { tenantIds: [UEI, HRPG] })
    const { POST } = await carregarRota()
    const res = await POST(reqCriar(corpo({ tenantId: HRPG })))
    expect(res.status).toBe(201)
    expect(criar).toHaveBeenCalledWith(HRPG, 'user-1', expect.anything(), undefined)
  })

  it('admin_multi com tenant fora do escopo recebe 403 (sem fallback)', async () => {
    sessao = sessaoDe('admin_multi', { tenantIds: [UEI, HRPG] })
    const { POST } = await carregarRota()
    const res = await POST(reqCriar(corpo({ tenantId: FORA_DO_ESCOPO })))
    expect(res.status).toBe(403)
    expect(criar).not.toHaveBeenCalled()
  })

  it('admin_multi sem tenantId no corpo usa a unidade primária da sessão', async () => {
    sessao = sessaoDe('admin_multi', { tenantIds: [UEI, HRPG] })
    const { POST } = await carregarRota()
    const res = await POST(reqCriar(corpo()))
    expect(res.status).toBe(201)
    expect(criar).toHaveBeenCalledWith(UEI, 'user-1', expect.anything(), undefined)
  })

  it('tenant_admin tem o tenantId do corpo ignorado (usa a sessão)', async () => {
    sessao = sessaoDe('tenant_admin')
    const { POST } = await carregarRota()
    const res = await POST(reqCriar(corpo({ tenantId: HRPG })))
    expect(res.status).toBe(201)
    expect(criar).toHaveBeenCalledWith(UEI, 'user-1', expect.anything(), undefined)
  })

  it('viewer (alias legado, fora de ROLES_CRIACAO) recebe 403', async () => {
    sessao = sessaoDe('viewer', { tenantIds: [UEI, HRPG] })
    const { POST } = await carregarRota()
    const res = await POST(reqCriar(corpo({ tenantId: HRPG })))
    expect(res.status).toBe(403)
    expect(criar).not.toHaveBeenCalled()
  })
})
