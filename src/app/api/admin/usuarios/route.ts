import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, created, badRequest, conflict, forbidden, serverError } from '@/lib/api-response'
import { CreateUsuarioSchema } from '@/modules/usuarios/usuarios.types'
import * as usuariosService from '@/modules/usuarios/usuarios.service'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'viewer'])
  if (!session) return forbidden()

  try {
    let usuarios
    if (session.role === 'tenant_admin') {
      usuarios = await usuariosService.listarUsuariosPorTenant(session.tenantId!)
    } else if (session.role === 'viewer') {
      const ids = session.tenantIds ?? (session.tenantId ? [session.tenantId] : [])
      usuarios = await usuariosService.listarUsuariosPorTenants(ids)
    } else {
      usuarios = await usuariosService.listarUsuarios()
    }
    return ok(usuarios)
  } catch (e) {
    console.error('[admin/usuarios] erro:', e)
    return serverError('listarUsuarios failed')
  }
}

export async function POST(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
  if (!session) return forbidden()

  const body = await req.json()
  const data = session.role === 'tenant_admin'
    ? { ...body, tenantId: session.tenantId }
    : body

  const parsed = CreateUsuarioSchema.safeParse(data)
  if (!parsed.success) return badRequest(JSON.stringify(parsed.error.flatten().fieldErrors))

  if (session.role === 'tenant_admin' && parsed.data.role === 'super_admin') return forbidden()

  try {
    const usuario = await usuariosService.criarUsuario(parsed.data)
    return created(usuario)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Unique constraint')) return conflict('Nome de usuário já cadastrado')
    return serverError('criarUsuario failed')
  }
}
