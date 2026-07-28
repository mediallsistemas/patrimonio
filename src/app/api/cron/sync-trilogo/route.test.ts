import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// A rota dispara sincronização destrutiva de ambientes (apaga blocos e
// ambientes sumidos do Trílogo). Estes testes existem para garantir que nada
// além do segredo abre essa porta — o buraco anterior era um header de
// requisição aceito sem conferência de conteúdo.

const sincronizarTenant = vi.fn()
const findMany = vi.fn()

vi.mock('@/lib/db-auth', () => ({
  prismaAuth: { tenant: { findMany: () => findMany() } },
}))
vi.mock('@/modules/ambientes/ambientes.service', () => ({
  sincronizarTenant: (id: string) => sincronizarTenant(id),
}))
vi.mock('@/lib/blocos-cache', () => ({ invalidarCacheBlocos: vi.fn() }))

const SEGREDO = 'segredo-de-cron-para-teste'

async function carregarRota() {
  vi.resetModules()
  return await import('./route')
}

function req(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/cron/sync-trilogo', { headers })
}

beforeEach(() => {
  vi.clearAllMocks()
  findMany.mockResolvedValue([])
  vi.stubEnv('CRON_SECRET', SEGREDO)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('autenticação do cron', () => {
  it('aceita o Bearer correto', async () => {
    const { GET } = await carregarRota()
    const res = await GET(req({ authorization: `Bearer ${SEGREDO}` }))
    expect(res.status).toBe(200)
  })

  it('recusa requisição sem header nenhum', async () => {
    const { GET } = await carregarRota()
    const res = await GET(req())
    expect(res.status).toBe(403)
    expect(findMany).not.toHaveBeenCalled()
  })

  it('x-vercel-cron-signature preenchido NÃO autentica', async () => {
    const { GET } = await carregarRota()
    const res = await GET(req({ 'x-vercel-cron-signature': 'qualquercoisa' }))
    expect(res.status).toBe(403)
    expect(findMany).not.toHaveBeenCalled()
  })

  it('recusa Bearer errado', async () => {
    const { GET } = await carregarRota()
    const res = await GET(req({ authorization: 'Bearer errado' }))
    expect(res.status).toBe(403)
  })

  it('recusa o segredo cru, sem o prefixo Bearer', async () => {
    const { GET } = await carregarRota()
    const res = await GET(req({ authorization: SEGREDO }))
    expect(res.status).toBe(403)
  })

  it('POST usa a mesma porta que o GET', async () => {
    const { POST } = await carregarRota()
    expect((await POST(req({ 'x-vercel-cron-signature': 'x' }))).status).toBe(403)
    expect((await POST(req({ authorization: `Bearer ${SEGREDO}` }))).status).toBe(200)
  })

  it('sem CRON_SECRET no ambiente, ninguém entra', async () => {
    vi.stubEnv('CRON_SECRET', '')
    const { GET } = await carregarRota()
    expect((await GET(req({ authorization: 'Bearer ' }))).status).toBe(403)
    expect((await GET(req({ 'x-vercel-cron-signature': 'x' }))).status).toBe(403)
    expect(findMany).not.toHaveBeenCalled()
  })
})
