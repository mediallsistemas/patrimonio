import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// A rota dispara sincronização destrutiva de ambientes (apaga blocos e
// ambientes sumidos do Trílogo). Estes testes existem para garantir que nada
// além do segredo abre essa porta — o buraco anterior era um header de
// requisição aceito sem conferência de conteúdo.

const sincronizarTenant = vi.fn()
const findMany = vi.fn()
const sincronizarChamados = vi.fn()

vi.mock('@/lib/db-auth', () => ({
  prismaAuth: { tenant: { findMany: () => findMany() } },
}))
vi.mock('@/modules/ambientes/ambientes.service', () => ({
  sincronizarTenant: (id: string) => sincronizarTenant(id),
}))
vi.mock('@/lib/blocos-cache', () => ({ invalidarCacheBlocos: vi.fn() }))
vi.mock('@/modules/chamados/chamados-sync.service', async (original) => {
  const real = await original() as Record<string, unknown>
  return {
    ...real,
    sincronizarChamadosTrilogo: (i: string, f: string) => sincronizarChamados(i, f),
  }
})

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
  sincronizarChamados.mockResolvedValue({
    buscados: 0, criados: 0, jaExistiam: 0, emTriagem: 0, triagem: [],
    vinculadosSoPorEmpresa: 0, janela: { inicio: '', fim: '' },
  })
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

// A janela larga é o que torna a sincronização automática e dispensa backfill
// manual: medido em produção, 7 dias custam 1,0s de API e 365 dias custam 2,5s.
// Reduzir isto de volta reintroduz a necessidade de alguém apertar um botão.
describe('janela de sincronização', () => {
  it('cobre um ano, não alguns dias', async () => {
    const { GET } = await carregarRota()
    await GET(req({ authorization: `Bearer ${SEGREDO}` }))

    expect(sincronizarChamados).toHaveBeenCalledTimes(1)
    const [inicio, fim] = sincronizarChamados.mock.calls[0]
    const dias = (new Date(fim).getTime() - new Date(inicio).getTime()) / 86_400_000
    expect(Math.round(dias)).toBe(365)
  })

  it('não sincroniza chamados quando a porta recusa', async () => {
    const { GET } = await carregarRota()
    await GET(req({ 'x-vercel-cron-signature': 'qualquercoisa' }))
    expect(sincronizarChamados).not.toHaveBeenCalled()
  })
})

// A tela de triagem foi removida; este aviso passou a ser o unico sinal de que
// algum ticket nao entrou. Se ele sumir, a recusa volta a ser silenciosa.
describe('aviso de tickets nao importados', () => {
  it('avisa no log quando algo cai na triagem, com a contagem por motivo', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    sincronizarChamados.mockResolvedValue({
      buscados: 3, criados: 1, jaExistiam: 0, emTriagem: 2,
      triagem: [
        { trilogoTicketId: 1, motivo: 'ticket sem descrição', statusOrigem: null, descricao: null, endereco: null, companyId: null },
        { trilogoTicketId: 2, motivo: 'ticket sem descrição', statusOrigem: null, descricao: null, endereco: null, companyId: null },
      ],
      vinculadosSoPorEmpresa: 0, janela: { inicio: '', fim: '' },
    })

    const { GET } = await carregarRota()
    await GET(req({ authorization: `Bearer ${SEGREDO}` }))

    expect(warn).toHaveBeenCalledTimes(1)
    const [msg, porMotivo] = warn.mock.calls[0]
    expect(String(msg)).toContain('2 ticket(s) nao importado(s)')
    expect(porMotivo).toEqual({ 'ticket sem descrição': 2 })
    warn.mockRestore()
  })

  it('não polui o log quando tudo importa', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { GET } = await carregarRota()
    await GET(req({ authorization: `Bearer ${SEGREDO}` }))
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
