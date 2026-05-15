import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, created, badRequest, unauthorized, forbidden, serverError } from '@/lib/api-response'
import * as manutencoesService from '@/modules/manutencoes/manutencoes.service'
import { IniciarManutencaoSchema } from '@/modules/manutencoes/manutencoes.types'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['operator', 'operator_patrimonio', 'tenant_admin'])
  if (!session) return unauthorized()
  if (!session.tenantId) return forbidden()

  try {
    const data = await manutencoesService.listarEmAndamentoDoUsuario(session.tenantId, session.sub)
    return ok(data)
  } catch {
    return serverError('listar manutencoes failed')
  }
}

export async function POST(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['operator', 'operator_patrimonio', 'tenant_admin'])
  if (!session) return unauthorized()
  if (!session.tenantId) return forbidden()

  const parsed = IniciarManutencaoSchema.safeParse(await req.json())
  if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

  try {
    const data = await manutencoesService.iniciar(session.tenantId, session.sub, parsed.data)
    return created(data)
  } catch {
    return serverError('iniciar manutencao failed')
  }
}
