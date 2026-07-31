import { verifyAuth } from '@/modules/auth/auth.guards'
import { allowedTenantIds } from '@/modules/auth/tenant-filter'
import { ok, forbidden, notFound, serverError } from '@/lib/api-response'
import * as usuariosService from '@/modules/usuarios/usuarios.service'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'admin_multi', 'viewer'])
  if (!session) return forbidden()

  const { id } = await params

  // Não-super só reseta usuários das unidades que administra — e nunca de um super_admin.
  if (session.role !== 'super_admin') {
    const alvo = await usuariosService.buscarUsuario(id)
    if (!alvo) return notFound('Usuário')
    if (alvo.role === 'super_admin') return forbidden()
    if (!alvo.tenantId || !allowedTenantIds(session).includes(alvo.tenantId)) return forbidden()
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
