import { verifyAuth } from '@/modules/auth/auth.guards'
import { created, forbidden, badRequest, serverError } from '@/lib/api-response'
import { RegistroAmbienteSchema } from '@/modules/rondas/rondas.types'
import { registrarAmbiente } from '@/modules/rondas/rondas.service'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
  if (!session) return forbidden()

  const { id: rondaId } = await params

  try {
    const parsed = RegistroAmbienteSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

    const registro = await registrarAmbiente(rondaId, parsed.data)
    return created(registro)
  } catch (err) {
    console.error('[rondas/ambientes] POST:', err)
    return serverError('registrarAmbiente failed')
  }
}
