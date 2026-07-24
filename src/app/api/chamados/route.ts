import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { ok, created, badRequest, unauthorized, forbidden, serverError } from '@/lib/api-response'
import * as chamadosQuery from '@/modules/chamados/chamados-query.service'
import * as chamadosCommand from '@/modules/chamados/chamados-command.service'
import {
  CriarChamadoSchema,
  FiltrosChamadosSchema,
} from '@/modules/chamados/chamados.types'
import {
  ROLES_LEITURA_CHAMADOS,
  ROLES_ESCRITA_CHAMADOS,
  podeAtribuir,
} from '@/modules/chamados/chamados.rules'

export async function GET(req: Request): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ROLES_LEITURA_CHAMADOS)
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session

  const url = new URL(req.url)
  const parsed = FiltrosChamadosSchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

  const tenantId = session.role === 'super_admin' ? null : session.tenantId
  if (session.role !== 'super_admin' && !tenantId) return forbidden()

  try {
    const chamados = await chamadosQuery.listar(
      { tenantId, tenantIds: session.tenantIds },
      session.role,
      parsed.data,
    )
    return ok(chamados)
  } catch {
    return serverError('listar chamados failed')
  }
}

export async function POST(req: Request): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ROLES_ESCRITA_CHAMADOS)
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session
  if (!session.tenantId) return forbidden()

  const parsed = CriarChamadoSchema.safeParse(await req.json())
  if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

  // Atribuição direta na criação é exclusiva de admin — para os demais roles
  // o campo é silenciosamente ignorado (o chamado nasce 'aberto')
  const atribuicao =
    parsed.data.responsavelId && podeAtribuir(session.role)
      ? { responsavelId: parsed.data.responsavelId, atribuidoPorId: session.sub }
      : undefined

  try {
    const chamado = await chamadosCommand.criar(session.tenantId, session.sub, parsed.data, atribuicao)
    return created(chamado)
  } catch {
    return serverError('criar chamado failed')
  }
}
