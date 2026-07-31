import { verifyAuth, assertSistema } from '@/modules/auth/auth.guards'
import { resolveActiveTenantId } from '@/modules/auth/tenant-filter'
import { ok, created, badRequest, forbidden, unauthorized, serverError } from '@/lib/api-response'
import { CreateAgendamentoSchema } from '@/modules/agendamentos/agendamentos.types'
import * as agendamentosService from '@/modules/agendamentos/agendamentos.service'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'admin_multi', 'viewer', 'operator_patrimonio'])
  if (!session) return unauthorized()
  assertSistema(session, 'linensistem')

  // Unidade ativa (admin_multi opera na unidade do slug atual)
  const tenantId = resolveActiveTenantId(session, req)

  try {
    const agendamentos = await agendamentosService.listarAgendamentos(tenantId)
    return ok(agendamentos)
  } catch {
    return serverError('listarAgendamentos failed')
  }
}

export async function POST(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'admin_multi', 'viewer', 'operator_patrimonio'])
  if (!session) return forbidden()
  assertSistema(session, 'linensistem')

  const tenantId = resolveActiveTenantId(session, req)

  const parsed = CreateAgendamentoSchema.safeParse(await req.json())
  if (!parsed.success) return badRequest(JSON.stringify(parsed.error.flatten().fieldErrors))

  try {
    const agendamento = await agendamentosService.criarAgendamento(parsed.data, session.sub, tenantId)
    return created(agendamento)
  } catch {
    return serverError('criarAgendamento failed')
  }
}
