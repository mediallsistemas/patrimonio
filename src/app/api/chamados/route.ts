import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { canScopeTenant, escopoSessao } from '@/modules/auth/tenant-filter'
import { ok, created, badRequest, unauthorized, forbidden, serverError } from '@/lib/api-response'
import * as chamadosQuery from '@/modules/chamados/chamados-query.service'
import * as chamadosCommand from '@/modules/chamados/chamados-command.service'
import * as tenantsService from '@/modules/tenants/tenants.service'
import {
  CriarChamadoSchema,
  FiltrosChamadosSchema,
} from '@/modules/chamados/chamados.types'
import {
  ROLES_LEITURA_CHAMADOS,
  ROLES_CRIACAO_CHAMADOS,
  podeAtribuir,
} from '@/modules/chamados/chamados.rules'

export async function GET(req: Request): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ROLES_LEITURA_CHAMADOS)
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session

  if (session.role !== 'super_admin' && !session.tenantId) return forbidden()

  const url = new URL(req.url)
  const parsed = FiltrosChamadosSchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

  try {
    const chamados = await chamadosQuery.listar(escopoSessao(session), session.role, parsed.data)
    return ok(chamados)
  } catch {
    return serverError('listar chamados failed')
  }
}

export async function POST(req: Request): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ROLES_CRIACAO_CHAMADOS)
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session

  const parsed = CriarChamadoSchema.safeParse(await req.json())
  if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

  // Tenant alvo: super_admin informa no corpo (não tem tenant próprio);
  // admin_multi pode informar qualquer unidade que administra (canScopeTenant
  // valida — fora do escopo é 403, nunca fallback silencioso); os demais roles
  // usam o tenant da sessão e o tenantId do corpo é ignorado.
  let tenantAlvo: string | null | undefined
  if (session.role === 'super_admin') {
    tenantAlvo = parsed.data.tenantId
  } else if (session.role === 'admin_multi' && parsed.data.tenantId) {
    if (!canScopeTenant(session, parsed.data.tenantId)) return forbidden()
    tenantAlvo = parsed.data.tenantId
  } else {
    tenantAlvo = session.tenantId
  }
  if (!tenantAlvo) {
    return session.role === 'super_admin'
      ? badRequest({ tenantId: ['Selecione o hospital'] })
      : forbidden()
  }

  // Atribuição direta na criação é exclusiva de admin — para os demais roles
  // o campo é silenciosamente ignorado (o chamado nasce 'aberto')
  const atribuicao =
    parsed.data.responsavelId && podeAtribuir(session.role)
      ? { responsavelId: parsed.data.responsavelId, atribuidoPorId: session.sub }
      : undefined

  try {
    // super_admin informa um tenant arbitrário do corpo — garantir que existe
    // e está ativo (retorno limpo em vez de 500 na busca de ambiente abaixo).
    // Para os demais roles o tenant vem da sessão, já confiável.
    if (session.role === 'super_admin') {
      const tenant = await tenantsService.buscarTenant(tenantAlvo)
      if (!tenant || !tenant.ativo) {
        return badRequest({ tenantId: ['Hospital inválido ou inativo'] })
      }
    }

    const chamado = await chamadosCommand.criar(tenantAlvo, session.sub, parsed.data, atribuicao)
    return created(chamado)
  } catch {
    return serverError('criar chamado failed')
  }
}
