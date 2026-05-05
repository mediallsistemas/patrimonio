import { ok, forbidden, serverError } from '@/lib/api-response'
import { prismaAuth } from '@/lib/db-auth'
import { sincronizarTenant } from '@/modules/ambientes/ambientes.service'
import { invalidarCacheBlocos } from '@/lib/blocos-cache'
import { timingSafeEqual } from '@/lib/crypto-utils'

const CRON_SECRET = process.env.CRON_SECRET ?? ''

function autenticado(req: Request): boolean {
  if (!CRON_SECRET) return false

  // Vercel Crons autenticam via header próprio (não Authorization)
  const vercelCronHeader = req.headers.get('x-vercel-cron-signature') ?? ''
  if (vercelCronHeader) return true // Vercel assina internamente com o projeto

  // Chamada manual (PM2 / curl): Authorization: Bearer <CRON_SECRET>
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

    return ok({ blocosCriados, ambientesCriados, ambientesRemovidos, blocosRemovidos, erros, tenantsSincronizados: tenants.length })
  } catch (err) {
    console.error('[cron/sync-trilogo]', err)
    return serverError('cron sync-trilogo failed')
  }
}

// GET — Vercel Crons
// POST — PM2 / chamada manual
export const GET = handler
export const POST = handler
