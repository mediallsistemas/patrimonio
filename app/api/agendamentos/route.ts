import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, created, badRequest, forbidden, unauthorized, serverError } from '@/lib/api-response'
import { CreateAgendamentoSchema } from '@/modules/agendamentos/agendamentos.types'
import * as agendamentosService from '@/modules/agendamentos/agendamentos.service'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
  if (!session) return unauthorized()

  try {
    const agendamentos = await agendamentosService.listarAgendamentos()
    return ok(agendamentos)
  } catch {
    return serverError('listarAgendamentos failed')
  }
}

export async function POST(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
  if (!session) return forbidden()

  const parsed = CreateAgendamentoSchema.safeParse(await req.json())
  if (!parsed.success) return badRequest(JSON.stringify(parsed.error.flatten().fieldErrors))

  try {
    const agendamento = await agendamentosService.criarAgendamento(parsed.data, session.sub)
    return created(agendamento)
  } catch {
    return serverError('criarAgendamento failed')
  }
}
