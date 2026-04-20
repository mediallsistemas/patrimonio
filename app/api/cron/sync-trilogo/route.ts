import { ok, forbidden, serverError } from '@/lib/api-response'
import { prismaAuth } from '@/lib/db-auth'
import { sincronizarTenant } from '@/modules/ambientes/ambientes.service'
import { invalidarCacheBlocos } from '@/lib/blocos-cache'
import { timingSafeEqual } from '@/lib/crypto-utils'

const CRON_SECRET = process.env.CRON_SECRET ?? ''

function autenticado(req: Request): boolean {
  if (!CRON_SECRET) return false
  const auth = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${CRON_SECRET}`
  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(auth, expected)
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
    let erros = 0

    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value) {
        blocosCriados += r.value.blocosCriados
        ambientesCriados += r.value.ambientesCriados
        invalidarCacheBlocos(tenants[i].id)
      } else if (r.status === 'rejected') {
        console.error(`[cron/sync-trilogo] tenant ${tenants[i].id}:`, r.reason)
        erros++
      }
    })

    return ok({ blocosCriados, ambientesCriados, erros, tenantsSincronizados: tenants.length })
  } catch (err) {
    console.error('[cron/sync-trilogo]', err)
    return serverError('cron sync-trilogo failed')
  }
}

// GET — Vercel Crons
// POST — PM2 / chamada manual
export const GET = handler
export const POST = handler
