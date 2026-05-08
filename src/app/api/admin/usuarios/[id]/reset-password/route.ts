import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, forbidden, notFound, serverError } from '@/lib/api-response'
import * as usuariosService from '@/modules/usuarios/usuarios.service'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'viewer'])
  if (!session) return forbidden()

  const { id } = await params

  if (session.role === 'viewer') {
    const alvo = await usuariosService.buscarUsuario(id)
    if (!alvo) return notFound('Usuário')
    const viewerTenantIds = session.tenantIds ?? (session.tenantId ? [session.tenantId] : [])
    if (!usuariosService.viewerOwnsUser(viewerTenantIds, alvo.tenantId)) return forbidden()
  }

  try {
    const resultado = await usuariosService.resetSenhaUsuario(id)
    return ok(resultado)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Record to update not found')) return notFound('Usuário')
    return serverError('resetSenhaUsuario failed')
  }
}
