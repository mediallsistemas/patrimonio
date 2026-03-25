import { ok, notFound, serverError } from '@/lib/api-response'
import { buscarFotoAlteracao } from '@/modules/rodadas/rodadas.service'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params
  try {
    const foto = await buscarFotoAlteracao(id)
    if (foto === null) return notFound('Alteração')
    return ok({ foto })
  } catch {
    return serverError('buscarFoto failed')
  }
}
