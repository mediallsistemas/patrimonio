import { verifyAuth } from '@/modules/auth/auth.guards'
import { allowedTenantIds } from '@/modules/auth/tenant-filter'
import { ok, noContent, badRequest, forbidden, notFound, serverError } from '@/lib/api-response'
import { UpdateUsuarioSchema } from '@/modules/usuarios/usuarios.types'
import * as usuariosService from '@/modules/usuarios/usuarios.service'
import type { JWTPayload } from '@/modules/auth/auth.types'

// Paridade de usabilidade entre os papéis admin: todos podem ver/editar/excluir
// usuários, mas o alcance muda — super_admin qualquer um; tenant_admin os da
// própria unidade; admin_multi (e viewer, alias legado) os das unidades de
// tenantIds. Não-super nunca mexe em contas super_admin nem promove a
// super_admin/admin_multi.
const ROLES = ['super_admin', 'tenant_admin', 'admin_multi', 'viewer'] as const

type Alvo = { tenantId: string | null; role?: string } | null

function podeAgirSobre(session: JWTPayload, alvo: NonNullable<Alvo>): boolean {
  if (session.role === 'super_admin') return true
  if (alvo.role === 'super_admin') return false // ninguém abaixo mexe em super_admin
  return alvo.tenantId !== null && allowedTenantIds(session).includes(alvo.tenantId)
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, [...ROLES])
  if (!session) return forbidden()

  const { id } = await params
  try {
    const usuario = await usuariosService.buscarUsuario(id)
    if (!usuario) return notFound('Usuário')
    if (!podeAgirSobre(session, usuario)) return forbidden()
    return ok(usuario)
  } catch {
    return serverError('buscarUsuario failed')
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, [...ROLES])
  if (!session) return forbidden()

  const { id } = await params
  const body = await req.json() as { role?: string }

  if (session.role !== 'super_admin') {
    const alvo = await usuariosService.buscarUsuario(id)
    if (!alvo) return notFound('Usuário')
    if (!podeAgirSobre(session, alvo)) return forbidden()
    // não-super não promove para papéis acima do próprio alcance
    if (body.role === 'super_admin' || body.role === 'admin_multi') return forbidden()
  }

  const parsed = UpdateUsuarioSchema.safeParse(body)
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
  const session = await verifyAuth(req, [...ROLES])
  if (!session) return forbidden()

  const { id } = await params

  if (session.role !== 'super_admin') {
    const alvo = await usuariosService.buscarUsuario(id)
    if (!alvo) return notFound('Usuário')
    if (!podeAgirSobre(session, alvo)) return forbidden()
  }

  try {
    await usuariosService.deletarUsuario(id)
    return noContent()
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Record to delete does not exist')) return notFound('Usuário')
    return serverError('deletarUsuario failed')
  }
}
