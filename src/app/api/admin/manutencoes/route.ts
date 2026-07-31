import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { escopoLeitura } from '@/modules/auth/tenant-filter'
import { ok, unauthorized, forbidden, serverError } from '@/lib/api-response'
import { listarManutencoesAdmin } from '@/modules/manutencoes/manutencoes.service'

/**
 * Painel gerencial de manutenções — atravessa unidades.
 *
 * O escopo sai de `escopoLeitura`: super_admin enxerga tudo, os demais ficam
 * restritos às próprias unidades, e sessão sem unidade não enxerga nada (o tipo
 * distingue "vê tudo" de "sem unidade", que em `tenantFilter` são o mesmo null).
 */
export async function GET(req: Request): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ['super_admin', 'tenant_admin', 'admin_multi', 'viewer'])
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()

  try {
    return ok(await listarManutencoesAdmin(escopoLeitura(auth.session)))
  } catch {
    return serverError('listarManutencoesAdmin failed')
  }
}
