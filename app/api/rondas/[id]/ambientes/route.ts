import { verifyAuthDetailed, assertSistema } from '@/modules/auth/auth.guards'
import { created, unauthorized, forbidden, badRequest, notFound, serverError } from '@/lib/api-response'
import { RegistroAmbienteSchema } from '@/modules/rondas/rondas.types'
import { buscarRonda, registrarAmbiente } from '@/modules/rondas/rondas.service'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ['super_admin', 'tenant_admin', 'operator'])
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  await assertSistema(auth.session, 'linenSistem')
  const session = auth.session

  const { id: rondaId } = await params
  const tenantId = session.role === 'super_admin' ? null : session.tenantId!

  try {
    // Verifica que a ronda existe e pertence ao tenant do usuário
    const ronda = await buscarRonda(rondaId, tenantId)
    if (!ronda) return notFound('Ronda')

    const parsed = RegistroAmbienteSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest(JSON.stringify(parsed.error.flatten().fieldErrors))

    const registro = await registrarAmbiente(rondaId, parsed.data)
    return created(registro)
  } catch (err) {
    console.error('[rondas/ambientes] POST:', err)
    return serverError('registrarAmbiente failed')
  }
}
