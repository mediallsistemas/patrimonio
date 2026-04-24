import { ok, notFound, serverError } from '@/lib/api-response'
import { buscarPessoa, deletarPessoa } from '@/modules/pessoas/pessoas.service'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params
  try {
    const pessoa = await buscarPessoa(id)
    if (!pessoa) return notFound('Pessoa')
    return ok(pessoa)
  } catch {
    return serverError('buscarPessoa failed')
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params
  try {
    await deletarPessoa(id)
    return ok({ success: true })
  } catch {
    return serverError('deletarPessoa failed')
  }
}
