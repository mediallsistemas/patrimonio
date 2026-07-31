import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { resolveActiveTenantId } from '@/modules/auth/tenant-filter'
import { noContent, ok, unauthorized, serverError, forbidden } from '@/lib/api-response'
import { buscarDraft, salvarDraft, descartarDraft } from '@/modules/rondas/ronda-draft.service'

const SUPER_ADMIN_TENANT = '00000000-0000-0000-0000-000000000001'

const DRAFT_ROLES = ['super_admin', 'tenant_admin', 'admin_multi', 'viewer', 'operator'] as const

function draftTenantId(session: Parameters<typeof resolveActiveTenantId>[0], req: Request): string {
  // Unidade ativa (admin_multi) → tenant primário → tenant sintético do super_admin
  return resolveActiveTenantId(session, req) ?? SUPER_ADMIN_TENANT
}

export async function GET(req: Request): Promise<Response> {
  try {
    const auth = await verifyAuthDetailed(req, [...DRAFT_ROLES])
    if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
    const draft = await buscarDraft(draftTenantId(auth.session, req), auth.session.sub)
    return ok(draft)
  } catch {
    return serverError('buscarDraft failed')
  }
}

export async function PUT(req: Request): Promise<Response> {
  try {
    const auth = await verifyAuthDetailed(req, [...DRAFT_ROLES])
    if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
    const estado = await req.json()
    const draft = await salvarDraft(draftTenantId(auth.session, req), auth.session.sub, estado)
    return ok(draft)
  } catch {
    return serverError('salvarDraft failed')
  }
}

export async function DELETE(req: Request): Promise<Response> {
  try {
    const auth = await verifyAuthDetailed(req, [...DRAFT_ROLES])
    if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
    await descartarDraft(draftTenantId(auth.session, req), auth.session.sub)
    return noContent()
  } catch {
    return serverError('descartarDraft failed')
  }
}
