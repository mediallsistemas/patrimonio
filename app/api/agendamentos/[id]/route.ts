import { verifyAuth, assertSistema } from '@/modules/auth/auth.guards'
import { ok, badRequest, forbidden, notFound, serverError } from '@/lib/api-response'
import { UpdateAgendamentoSchema } from '@/modules/agendamentos/agendamentos.types'
import * as agendamentosService from '@/modules/agendamentos/agendamentos.service'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
  if (!session) return forbidden()
  assertSistema(session, 'linensistem')

  const { id } = await params

  const parsed = UpdateAgendamentoSchema.safeParse(await req.json())
  if (!parsed.success) return badRequest(JSON.stringify(parsed.error.flatten().fieldErrors))

  try {
    const agendamento = await agendamentosService.atualizarStatusAgendamento(
      id,
      parsed.data,
      session.sub,
    )
    return ok(agendamento)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Record to update not found')) return notFound('Agendamento')
    return serverError('atualizarStatusAgendamento failed')
  }
}
