import { ok, forbidden, serverError } from '@/lib/api-response'
import { prismaAuth } from '@/lib/db-auth'
import { sincronizarTenant } from '@/modules/ambientes/ambientes.service'
import { invalidarCacheBlocos } from '@/lib/blocos-cache'
import { timingSafeEqual } from '@/lib/crypto-utils'
import { sincronizarChamadosTrilogo, janelaPadrao } from '@/modules/chamados/chamados-sync.service'

const CRON_SECRET = process.env.CRON_SECRET ?? ''

// Janela de busca de tickets.
//
// Um ano, e não alguns dias, porque a API do Trílogo devolve o histórico inteiro
// praticamente de graça: medido em produção, 7 dias custam 1,0s e 365 dias custam
// 2,5s — a diferença é menor que a variação entre duas chamadas. A base toda tem
// ~2.600 tickets.
//
// Isso elimina a necessidade de um backfill manual e faz a sincronização se
// curar sozinha: execução perdida, ticket corrigido no Trílogo depois de ter
// sido recusado, ou regra de conversão ajustada — tudo é reprocessado na noite
// seguinte. O índice único em trilogoTicketId garante que reprocessar não
// duplica, e a gravação em lote só insere o que falta.
const JANELA_DIAS = 365

// Porta única: Authorization: Bearer <CRON_SECRET>.
//
// A Vercel envia esse header sozinha nas execuções de cron quando CRON_SECRET
// existe nas env vars do projeto — não é preciso um segundo caminho, e é a
// mesma porta da chamada manual (PM2 / curl).
//
// Havia aqui um atalho que aceitava qualquer requisição com x-vercel-cron-signature
// preenchido, sem conferir o conteúdo. Como header de requisição é livre e o
// middleware libera /api/*, um curl com o header em qualquer valor executava o cron.
// Com a importação de chamados, esta rota deixou de só apagar ambientes e passou
// a criar registro em todas as unidades — mais um motivo para a porta ser uma só.
function autenticado(req: Request): boolean {
  if (!CRON_SECRET) return false

  const auth = req.headers.get('authorization') ?? ''
  return timingSafeEqual(auth, `Bearer ${CRON_SECRET}`)
}

async function handler(req: Request): Promise<Response> {
  if (!autenticado(req)) return forbidden()

  try {
    const tenants = await prismaAuth.tenant.findMany({
      where: { trilogoCompanyId: { not: null } },
      select: { id: true },
    })

    const results = await Promise.allSettled(
      tenants.map((t) => sincronizarTenant(t.id)),
    )

    let blocosCriados = 0
    let ambientesCriados = 0
    let ambientesRemovidos = 0
    let blocosRemovidos = 0
    let erros = 0

    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value) {
        blocosCriados     += r.value.blocosCriados
        ambientesCriados  += r.value.ambientesCriados
        ambientesRemovidos += r.value.ambientesRemovidos
        blocosRemovidos   += r.value.blocosRemovidos
        invalidarCacheBlocos(tenants[i].id)
      } else if (r.status === 'rejected') {
        console.error(`[cron/sync-trilogo] tenant ${tenants[i].id}:`, r.reason)
        erros++
      }
    })

    // Chamados vindos de tickets do Trílogo. Roda depois dos ambientes de propósito:
    // um ticket pode citar ambiente criado nesta mesma execução.
    // Falha aqui não invalida a sincronização de ambientes, que já foi concluída.
    let chamados: Awaited<ReturnType<typeof sincronizarChamadosTrilogo>> | null = null
    let erroChamados: string | null = null
    try {
      const { inicio, fim } = janelaPadrao(JANELA_DIAS)
      chamados = await sincronizarChamadosTrilogo(inicio, fim)
    } catch (err) {
      console.error('[cron/sync-trilogo] chamados:', err)
      erroChamados = (err as Error).message
    }

    // Ticket recusado não tem mais tela. Sem este aviso, ele existiria só na
    // tabela tickets_trilogo_triagem e ninguém ficaria sabendo — que era
    // exatamente o problema que a tabela resolveu.
    if (chamados && chamados.emTriagem > 0) {
      const porMotivo = chamados.triagem.reduce<Record<string, number>>((acc, t) => {
        acc[t.motivo] = (acc[t.motivo] ?? 0) + 1
        return acc
      }, {})
      console.warn(
        `[cron/sync-trilogo] ${chamados.emTriagem} ticket(s) nao importado(s):`,
        porMotivo,
        '— detalhe em GET /api/admin/chamados/triagem',
      )
    }

    return ok({
      blocosCriados,
      ambientesCriados,
      ambientesRemovidos,
      blocosRemovidos,
      erros,
      tenantsSincronizados: tenants.length,
      // Só as contagens: a fila de triagem em si fica na tabela
      // tickets_trilogo_triagem, então nada se perde por não vir na resposta.
      chamados: chamados
        ? {
            buscados: chamados.buscados,
            criados: chamados.criados,
            jaExistiam: chamados.jaExistiam,
            emTriagem: chamados.emTriagem,
            vinculadosSoPorEmpresa: chamados.vinculadosSoPorEmpresa,
            janela: chamados.janela,
          }
        : { erro: erroChamados },
    })
  } catch (err) {
    console.error('[cron/sync-trilogo]', err)
    return serverError('cron sync-trilogo failed')
  }
}

// GET — Vercel Crons
// POST — PM2 / chamada manual
export const GET = handler
export const POST = handler
