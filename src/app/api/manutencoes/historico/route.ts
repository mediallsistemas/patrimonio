import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { ok, unauthorized, forbidden, serverError } from '@/lib/api-response'
import { listarHistorico } from '@/modules/manutencoes/manutencoes.service'
import { ROLES_RELATORIO_MANUTENCOES } from '@/modules/manutencoes/manutencoes.rules'

// A lista não inclui 'operator' (ver manutencoes.rules.ts). Esconder o card na UI não
// protegeria nada sozinho — sem esta restrição o endpoint responderia a uma chamada direta.
export async function GET(req: Request): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ROLES_RELATORIO_MANUTENCOES)
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
  const session = auth.session

  const tenantId = session.role === 'super_admin' ? null : session.tenantId!

  try {
    const manutencoes = await listarHistorico(tenantId, session.tenantIds)
    return ok(manutencoes)
  } catch {
    return serverError('listarHistorico failed')
  }
}
