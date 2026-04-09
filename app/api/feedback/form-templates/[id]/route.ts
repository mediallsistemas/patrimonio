import { verifyAuth, assertSistema } from '@/modules/auth/auth.guards'
import * as templateService from '@/modules/feedback/form-template.service'
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from '@/lib/api-response'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, { params }: Params) {
  try {
    const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
    if (!session) return unauthorized()
    await assertSistema(session, 'feedbackForms')
    if (!session.tenantId) return badRequest('tenantId obrigatório')

    const { id } = await params
    const template = await templateService.buscarTemplate(id, session.tenantId)
    if (!template) return notFound('Template')
    return ok(template)
  } catch (err) {
    return serverError(err)
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
    if (!session) return unauthorized()
    await assertSistema(session, 'feedbackForms')
    if (!session.tenantId) return badRequest('tenantId obrigatório')

    const { id } = await params
    const body = await req.json()
    const result = await templateService.atualizarTemplate(id, session.tenantId, {
      nome:   body.nome,
      campos: body.campos,
      ativo:  body.ativo,
    })
    if (result.count === 0) return notFound('Template')
    return ok({ updated: result.count })
  } catch (err) {
    return serverError(err)
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
    if (!session) return unauthorized()
    await assertSistema(session, 'feedbackForms')
    if (!session.tenantId) return forbidden()

    const { id } = await params
    const result = await templateService.deletarTemplate(id, session.tenantId)
    if (result.count === 0) return notFound('Template')
    return ok({ deleted: result.count })
  } catch (err) {
    return serverError(err)
  }
}
