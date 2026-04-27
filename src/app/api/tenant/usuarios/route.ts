import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, created, badRequest, conflict, forbidden, serverError } from '@/lib/api-response'
import { CreateUsuarioSchema } from '@/modules/usuarios/usuarios.types'
import * as usuariosService from '@/modules/usuarios/usuarios.service'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['tenant_admin'])
  if (!session) return forbidden()

  try {
    const usuarios = await usuariosService.listarUsuariosPorTenant(session.tenantId!)
    return ok(usuarios)
  } catch {
    return serverError('listarUsuariosPorTenant failed')
  }
}

export async function POST(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['tenant_admin'])
  if (!session) return forbidden()

  const body = await req.json()
  // Força tenantId e bloqueia criação de super_admin
  const parsed = CreateUsuarioSchema.safeParse({ ...body, tenantId: session.tenantId })
  if (!parsed.success) return badRequest(JSON.stringify(parsed.error.flatten().fieldErrors))

  if (parsed.data.role === 'super_admin') return forbidden()

  try {
    const usuario = await usuariosService.criarUsuario(parsed.data)
    return created(usuario)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Unique constraint')) return conflict('Nome de usuário já cadastrado')
    return serverError('criarUsuario failed')
  }
}
