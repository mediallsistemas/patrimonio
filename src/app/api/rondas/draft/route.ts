import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { noContent, ok, unauthorized, serverError, forbidden } from '@/lib/api-response'
import { buscarDraft, salvarDraft, descartarDraft } from '@/modules/rondas/ronda-draft.service'

const SUPER_ADMIN_TENANT = '00000000-0000-0000-0000-000000000001'

function resolveTenantId(session: { role: string; tenantId?: string | null }): string {
  return session.role === 'super_admin' ? SUPER_ADMIN_TENANT : session.tenantId!
}

export async function GET(req: Request): Promise<Response> {
  try {
    const auth = await verifyAuthDetailed(req, ['super_admin', 'tenant_admin', 'operator'])
    if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
    const draft = await buscarDraft(resolveTenantId(auth.session), auth.session.sub)
    return ok(draft)
  } catch {
    return serverError('buscarDraft failed')
  }
}

export async function PUT(req: Request): Promise<Response> {
  try {
    const auth = await verifyAuthDetailed(req, ['super_admin', 'tenant_admin', 'operator'])
    if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
    const estado = await req.json()
    const draft = await salvarDraft(resolveTenantId(auth.session), auth.session.sub, estado)
    return ok(draft)
  } catch {
    return serverError('salvarDraft failed')
  }
}

export async function DELETE(req: Request): Promise<Response> {
  try {
    const auth = await verifyAuthDetailed(req, ['super_admin', 'tenant_admin', 'operator'])
    if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
    await descartarDraft(resolveTenantId(auth.session), auth.session.sub)
    return noContent()
  } catch {
    return serverError('descartarDraft failed')
  }
}
