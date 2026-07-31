import { verifyAuth } from '@/modules/auth/auth.guards'
import { allowedTenantIds } from '@/modules/auth/tenant-filter'
import { ok, created, badRequest, conflict, forbidden, serverError } from '@/lib/api-response'
import { CreateUsuarioSchema } from '@/modules/usuarios/usuarios.types'
import * as usuariosService from '@/modules/usuarios/usuarios.service'

// Paridade entre papéis admin: mesma tela/rota, alcance diferente.
// super_admin → todos; tenant_admin → própria unidade; admin_multi/viewer → tenantIds.
const ROLES = ['super_admin', 'tenant_admin', 'admin_multi', 'viewer'] as const

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, [...ROLES])
  if (!session) return forbidden()

  try {
    const usuarios = session.role === 'super_admin'
      ? await usuariosService.listarUsuarios()
      : await usuariosService.listarUsuariosPorTenants(allowedTenantIds(session))
    return ok(usuarios)
  } catch (e) {
    console.error('[admin/usuarios] erro:', e)
    return serverError('listarUsuarios failed')
  }
}

export async function POST(req: Request): Promise<Response> {
  const session = await verifyAuth(req, [...ROLES])
  if (!session) return forbidden()

  const body = await req.json()

  let data: typeof body
  if (session.role === 'tenant_admin') {
    // tenant_admin cria sempre na própria unidade
    data = { ...body, tenantId: session.tenantId }
  } else if (session.role !== 'super_admin') {
    // admin_multi/viewer só criam em unidades que administram
    const meusTenants = allowedTenantIds(session)
    const targetTenantId = body.tenantId as string | undefined
    if (!targetTenantId || !meusTenants.includes(targetTenantId)) return forbidden()
    data = body
  } else {
    data = body
  }

  const parsed = CreateUsuarioSchema.safeParse(data)
  if (!parsed.success) return badRequest(JSON.stringify(parsed.error.flatten().fieldErrors))

  // não-super não cria papéis acima do próprio alcance
  if (session.role !== 'super_admin' &&
      (parsed.data.role === 'super_admin' || parsed.data.role === 'admin_multi')) {
    return forbidden()
  }

  try {
    const usuario = await usuariosService.criarUsuario(parsed.data)
    return created(usuario)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Unique constraint') || msg.includes('duplicate key')) return conflict('Nome de usuário já cadastrado')
    return serverError('criarUsuario failed')
  }
}
