import { verifyAuth, assertSistema } from '@/modules/auth/auth.guards'
import * as templateService from '@/modules/feedback/form-template.service'
import { ok, created, badRequest, unauthorized, serverError } from '@/lib/api-response'

export async function GET(req: Request) {
  try {
    const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
    if (!session) return unauthorized()
    await assertSistema(session, 'feedbackForms')
    if (!session.tenantId) return badRequest('tenantId obrigatório')

    const templates = await templateService.listarTemplates(session.tenantId)
    return ok(templates)
  } catch (err) {
    return serverError(err)
  }
}

export async function POST(req: Request) {
  try {
    const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
    if (!session) return unauthorized()
    await assertSistema(session, 'feedbackForms')
    if (!session.tenantId) return badRequest('tenantId obrigatório')

    const body = await req.json()
    if (!body.nome || !Array.isArray(body.campos)) {
      return badRequest('nome e campos são obrigatórios')
    }

    const template = await templateService.criarTemplate(session.tenantId, {
      nome: body.nome,
      campos: body.campos,
      ativo: body.ativo,
    })
    return created(template)
  } catch (err) {
    return serverError(err)
  }
}
