import { NextRequest } from 'next/server'
import { created, badRequest, notFound, serverError } from '@/lib/api-response'
import { buscarTenantPorSlug } from '@/modules/tenants/tenants.service'
import { criarMovimentacao } from '@/modules/movimentacoes/movimentacoes.service'
import { NenhumaPendenteError } from '@/modules/movimentacoes/movimentacoes.types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> },
): Promise<Response> {
  const { tenantSlug } = await params
  const { pessoaId, tipo } = await req.json()

  if (!pessoaId || !tipo || !['retirada', 'devolucao'].includes(tipo)) {
    return badRequest('Dados inválidos')
  }

  try {
    const tenant = await buscarTenantPorSlug(tenantSlug)
    if (!tenant) return notFound('Tenant')

    const mov = await criarMovimentacao(tenant.id, pessoaId, tipo as 'retirada' | 'devolucao')
    return created({ id: mov.id })
  } catch (err) {
    if (err instanceof NenhumaPendenteError) return badRequest('Nenhuma retirada pendente para devolver')
    return serverError('criarMovimentacao failed')
  }
}
