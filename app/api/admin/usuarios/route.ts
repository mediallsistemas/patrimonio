import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, created, badRequest, conflict, forbidden, serverError } from '@/lib/api-response'
import { CreateUsuarioSchema } from '@/modules/usuarios/usuarios.types'
import * as usuariosService from '@/modules/usuarios/usuarios.service'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin'])
  if (!session) return forbidden()

  try {
    const usuarios = await usuariosService.listarUsuarios()
    return ok(usuarios)
  } catch {
    return serverError('listarUsuarios failed')
  }
}

export async function POST(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin'])
  if (!session) return forbidden()

  const parsed = CreateUsuarioSchema.safeParse(await req.json())
  if (!parsed.success) return badRequest(JSON.stringify(parsed.error.flatten().fieldErrors))

  try {
    const usuario = await usuariosService.criarUsuario(parsed.data)
    return created(usuario)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Unique constraint')) return conflict('E-mail já cadastrado')
    return serverError('criarUsuario failed')
  }
}
