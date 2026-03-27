import { verifyAuth } from '@/modules/auth/auth.guards'
import { noContent, ok, serverError, forbidden } from '@/lib/api-response'
import { buscarDraft, salvarDraft, descartarDraft } from '@/modules/rondas/ronda-draft.service'

const SUPER_ADMIN_TENANT = '00000000-0000-0000-0000-000000000001'

function resolveTenantId(session: { role: string; tenantId?: string | null }): string {
  return session.role === 'super_admin' ? SUPER_ADMIN_TENANT : session.tenantId!
}

export async function GET(req: Request): Promise<Response> {
  try {
    const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'operator'])
    if (!session) return forbidden()
    const draft = await buscarDraft(resolveTenantId(session), session.sub)
    return ok(draft)
  } catch {
    return serverError('buscarDraft failed')
  }
}

export async function PUT(req: Request): Promise<Response> {
  try {
    const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'operator'])
    if (!session) return forbidden()
    const estado = await req.json()
    const draft = await salvarDraft(resolveTenantId(session), session.sub, estado)
    return ok(draft)
  } catch {
    return serverError('salvarDraft failed')
  }
}

export async function DELETE(req: Request): Promise<Response> {
  try {
    const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'operator'])
    if (!session) return forbidden()
    await descartarDraft(resolveTenantId(session), session.sub)
    return noContent()
  } catch {
    return serverError('descartarDraft failed')
  }
}
