import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, forbidden, notFound, serverError } from '@/lib/api-response'
import * as usuariosService from '@/modules/usuarios/usuarios.service'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin'])
  if (!session) return forbidden()

  const { id } = await params
  try {
    const usuario = await usuariosService.resetSenhaUsuario(id)
    return ok(usuario)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Record to update not found')) return notFound('Usuário')
    return serverError('resetSenhaUsuario failed')
  }
}
