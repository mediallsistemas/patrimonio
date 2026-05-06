import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { created, unauthorized, forbidden, badRequest, notFound, conflict, serverError } from '@/lib/api-response'
import { RegistroAmbienteSchema } from '@/modules/rondas/rondas.types'
import { buscarRonda, registrarAmbiente } from '@/modules/rondas/rondas.service'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ['super_admin', 'tenant_admin', 'operator'])
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session

  const { id: rondaId } = await params
  const tenantId = session.role === 'super_admin' ? null : session.tenantId!

  try {
    // Verifica que a ronda existe, pertence ao tenant e ainda está aberta
    const ronda = await buscarRonda(rondaId, tenantId, session.tenantIds)
    if (!ronda) return notFound('Ronda')
    if (ronda.finalizadoEm !== null) return conflict('Ronda já foi finalizada')

    const parsed = RegistroAmbienteSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest(parsed.error.issues)

    const registro = await registrarAmbiente(rondaId, parsed.data)
    return created(registro)
  } catch (err) {
    console.error('[rondas/ambientes] POST:', err)
    return serverError('registrarAmbiente failed')
  }
}
