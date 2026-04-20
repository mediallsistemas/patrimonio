import { NextRequest } from 'next/server'
import { verifyAuth, assertSistema } from '@/modules/auth/auth.guards'
import { resolveTenantId } from '@/modules/auth/tenant-resolver'
import * as responseService from '@/modules/feedback/form-response.service'
import { ok, badRequest, unauthorized, notFound, serverError } from '@/lib/api-response'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
    if (!session) return unauthorized()
    assertSistema(session, 'feedbackforms')

    const tenantId = await resolveTenantId(session, req.nextUrl.searchParams.get('tenantSlug'))
    if (!tenantId && session.role !== 'super_admin') return badRequest('tenantId obrigatório')

    const { id } = await params
    const resposta = await responseService.buscarResposta(id, tenantId)
    if (!resposta) return notFound('Resposta')
    return ok(resposta)
  } catch (err) {
    return serverError(err)
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
    if (!session) return unauthorized()
    assertSistema(session, 'feedbackforms')

    const tenantId = await resolveTenantId(session, req.nextUrl.searchParams.get('tenantSlug'))
    if (!tenantId && session.role !== 'super_admin') return badRequest('tenantId obrigatório')

    const { id } = await params
    const result = await responseService.softDeletarResposta(id, tenantId)
    if (result.count === 0) return notFound('Resposta')
    return ok({ deleted: result.count })
  } catch (err) {
    return serverError(err)
  }
}
