import { verifyAuth, assertSistema } from '@/modules/auth/auth.guards'
import { escopoLeitura } from '@/modules/auth/tenant-filter'
import { ok, forbidden, notFound, unauthorized, serverError } from '@/lib/api-response'
import * as anexosBensService from '@/modules/anexos-bens/anexos-bens.service'

const ROLES = ['super_admin', 'tenant_admin', 'admin_multi', 'viewer'] as const

// Conteudo do anexo em base64. Volta como JSON (e nao como binario) para seguir
// o contrato de resposta do projeto — o cliente monta o Blob e dispara o
// download. Viavel porque o teto por arquivo e de 3 MB.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const session = await verifyAuth(req, [...ROLES])
  if (!session) return unauthorized()
  try { assertSistema(session, 'linensistem') } catch { return forbidden() }

  const { id } = await ctx.params

  try {
    const anexo = await anexosBensService.buscarConteudo(id, escopoLeitura(session))
    if (!anexo) return notFound('Anexo')
    return ok(anexo)
  } catch {
    return serverError('buscarConteudoAnexo failed')
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const session = await verifyAuth(req, [...ROLES])
  if (!session) return unauthorized()
  try { assertSistema(session, 'linensistem') } catch { return forbidden() }

  const { id } = await ctx.params

  try {
    const removido = await anexosBensService.remover(id, session.sub, escopoLeitura(session))
    if (!removido) return notFound('Anexo')
    return ok({ id })
  } catch {
    return serverError('removerAnexoBem failed')
  }
}
