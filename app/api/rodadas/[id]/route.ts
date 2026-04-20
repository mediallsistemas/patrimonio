import { ok, serverError } from '@/lib/api-response'
import { finalizarRodada } from '@/modules/rodadas/rodadas.service'

export async function PATCH(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params
  try {
    const rodada = await finalizarRodada(id)
    return ok(rodada)
  } catch {
    return serverError('finalizarRodada failed')
  }
}
