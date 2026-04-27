import { getSession } from '@/lib/auth'
import { ok, unauthorized, forbidden, serverError } from '@/lib/api-response'
import { finalizarRodada } from '@/modules/rodadas/rodadas.service'

export async function PATCH(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getSession()
  if (!session) return unauthorized()

  if (session.role === 'super_admin') return forbidden()

  const { id } = await params
  try {
    const rodada = await finalizarRodada(id)
    return ok(rodada)
  } catch {
    return serverError('finalizarRodada failed')
  }
}
