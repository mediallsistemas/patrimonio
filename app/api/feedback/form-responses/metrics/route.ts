import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/modules/auth/auth.guards'
import { resolveTenantId } from '@/modules/auth/tenant-resolver'
import { ok, badRequest, unauthorized, serverError } from '@/lib/api-response'

// Métricas agregadas que a SPA FeedbackForms espera:
// { totalResponses, averageSatisfaction, responsesThisMonth, responsesLastMonth, averageNps }
export async function GET(req: NextRequest) {
  try {
    const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
    if (!session) return unauthorized()

    const { searchParams } = req.nextUrl
    const tenantId = await resolveTenantId(session, searchParams.get('tenantSlug'))
    if (!tenantId) return badRequest('tenantSlug obrigatório para super_admin')

    const startDate = searchParams.get('startDate')
    const endDate   = searchParams.get('endDate')
    const formType  = searchParams.get('formType')

    const where = {
      tenantId,
      deletadoEm: null as null,
      ...(formType && { setor: formType }),
      ...(startDate || endDate
        ? { criadoEm: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate   && { lte: new Date(endDate) }),
          }}
        : {}),
    }

    const respostas = await prisma.respostaFormulario.findMany({
      where,
      select: { respostas: true, criadoEm: true },
    })

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    let totalNota = 0
    let countNotas = 0
    let totalNps = 0
    let countNps = 0
    let responsesThisMonth = 0
    let responsesLastMonth = 0

    for (const r of respostas) {
      const campos = r.respostas as Array<{ pergunta: string; nota?: number }>
      if (Array.isArray(campos)) {
        for (const c of campos) {
          if (typeof c.nota === 'number') {
            const p = c.pergunta?.toLowerCase() ?? ''
          if (p === 'recomendaria' || p === 'nps' || p.includes('recomend')) {
              totalNps += c.nota
              countNps++
            } else {
              totalNota += c.nota
              countNotas++
            }
          }
        }
      }

      if (r.criadoEm >= thisMonthStart) responsesThisMonth++
      else if (r.criadoEm >= lastMonthStart) responsesLastMonth++
    }

    return ok({
      totalResponses:        respostas.length,
      averageSatisfaction:   countNotas > 0 ? parseFloat((totalNota / countNotas).toFixed(2)) : 0,
      averageNps:            countNps   > 0 ? parseFloat((totalNps  / countNps).toFixed(2))   : 0,
      averageRecomendaria:   countNps   > 0 ? parseFloat((totalNps  / countNps).toFixed(2))   : 0,
      responsesThisMonth,
      responsesLastMonth,
    })
  } catch (err) {
    return serverError(err)
  }
}
