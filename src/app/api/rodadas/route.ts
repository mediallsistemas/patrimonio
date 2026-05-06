import { getSession } from '@/lib/auth'
import { ok, created, unauthorized, badRequest, serverError } from '@/lib/api-response'
import { listarRodadas, criarRodada } from '@/modules/rodadas/rodadas.service'

export async function GET(): Promise<Response> {
  const session = await getSession()
  if (!session) return unauthorized()

  try {
    const tenantId = session.role === 'super_admin' ? null : session.tenantId!
    const rodadas = await listarRodadas(tenantId, 50, session.tenantIds)
    return ok(rodadas)
  } catch {
    return serverError('listarRodadas failed')
  }
}

export async function POST(): Promise<Response> {
  const session = await getSession()
  if (!session) return unauthorized()

  if (session.role === 'super_admin') {
    return badRequest('super_admin não pode criar rodadas sem contexto de tenant')
  }

  try {
    const rodada = await criarRodada(session.tenantId!, session.userId)
    return created(rodada)
  } catch {
    return serverError('criarRodada failed')
  }
}
