import { verifyAuth, assertSistema } from '@/modules/auth/auth.guards'
import { escopoLeitura, resolveActiveTenantId } from '@/modules/auth/tenant-filter'
import { ok, created, badRequest, forbidden, unauthorized, serverError } from '@/lib/api-response'
import { CriarAnexoBemSchema } from '@/modules/anexos-bens/anexos-bens.types'
import * as anexosBensService from '@/modules/anexos-bens/anexos-bens.service'

// Anexar/remover documento de bem e acao administrativa: os mesmos papeis que
// entram em /admin/bens (ver ADMIN_PANEL_ROLES no middleware).
const ROLES = ['super_admin', 'tenant_admin', 'admin_multi', 'viewer'] as const

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, [...ROLES])
  if (!session) return unauthorized()
  try { assertSistema(session, 'linensistem') } catch { return forbidden() }

  try {
    const anexos = await anexosBensService.listar(escopoLeitura(session))
    return ok(anexos)
  } catch {
    return serverError('listarAnexosBens failed')
  }
}

export async function POST(req: Request): Promise<Response> {
  const session = await verifyAuth(req, [...ROLES])
  if (!session) return unauthorized()
  try { assertSistema(session, 'linensistem') } catch { return forbidden() }

  // Corpo grande (base64): JSON malformado ou acima do teto da plataforma
  // rejeita aqui, antes de chegar ao Zod.
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('Corpo inválido ou arquivo grande demais para o envio')
  }

  const parsed = CriarAnexoBemSchema.safeParse(body)
  if (!parsed.success) return badRequest('Anexo inválido: verifique nome, tipo e tamanho do arquivo')

  const tenantId = resolveActiveTenantId(session, req)

  try {
    const resultado = await anexosBensService.criar(
      parsed.data,
      session.sub,
      tenantId,
      escopoLeitura(session),
    )
    if (!resultado.ok) return badRequest(resultado.erro)
    return created(resultado.anexo)
  } catch {
    return serverError('criarAnexoBem failed')
  }
}
