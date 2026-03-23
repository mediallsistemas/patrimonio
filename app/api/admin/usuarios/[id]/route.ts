import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, noContent, badRequest, forbidden, notFound, serverError } from '@/lib/api-response'
import { UpdateUsuarioSchema } from '@/modules/usuarios/usuarios.types'
import * as usuariosService from '@/modules/usuarios/usuarios.service'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin'])
  if (!session) return forbidden()

  const { id } = await params
  try {
    const usuario = await usuariosService.buscarUsuario(id)
    if (!usuario) return notFound('Usuário')
    return ok(usuario)
  } catch {
    return serverError('buscarUsuario failed')
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin'])
  if (!session) return forbidden()

  const { id } = await params

  const parsed = UpdateUsuarioSchema.safeParse(await req.json())
  if (!parsed.success) return badRequest(JSON.stringify(parsed.error.flatten().fieldErrors))

  try {
    const usuario = await usuariosService.atualizarUsuario(id, parsed.data)
    return ok(usuario)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Record to update not found')) return notFound('Usuário')
    return serverError('atualizarUsuario failed')
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin'])
  if (!session) return forbidden()

  const { id } = await params
  try {
    await usuariosService.deletarUsuario(id)
    return noContent()
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Record to delete does not exist')) return notFound('Usuário')
    return serverError('deletarUsuario failed')
  }
}
