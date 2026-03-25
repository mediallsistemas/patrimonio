import { getSession } from '@/lib/auth'
import { ok, created, unauthorized, serverError } from '@/lib/api-response'
import { listarRodadas, criarRodada } from '@/modules/rodadas/rodadas.service'

const SUPER_ADMIN_TENANT = '00000000-0000-0000-0000-000000000001'

export async function GET(): Promise<Response> {
  const session = await getSession()
  if (!session) return unauthorized()

  try {
    const tenantId = session.role === 'super_admin' ? null : session.tenantId!
    const rodadas = await listarRodadas(tenantId)
    return ok(rodadas)
  } catch {
    return serverError('listarRodadas failed')
  }
}

export async function POST(): Promise<Response> {
  const session = await getSession()
  if (!session) return unauthorized()

  try {
    const tenantId =
      session.role === 'super_admin' ? SUPER_ADMIN_TENANT : session.tenantId!
    const rodada = await criarRodada(tenantId, session.userId)
    return created(rodada)
  } catch {
    return serverError('criarRodada failed')
  }
}
