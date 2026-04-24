import { ok, notFound, serverError } from '@/lib/api-response'
import { buscarFotoOcorrencia } from '@/modules/ocorrencias/ocorrencias.service'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params
  try {
    const foto = await buscarFotoOcorrencia(id)
    if (foto === null) return notFound('Ocorrência')
    return ok({ foto })
  } catch {
    return serverError('buscarFoto failed')
  }
}
