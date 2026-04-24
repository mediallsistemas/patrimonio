import { NextRequest } from 'next/server'

import { ok, created, badRequest, forbidden, notFound, serverError } from '@/lib/api-response'
import { verifyAuth } from '@/modules/auth/auth.guards'
import { resolverTenantPorSlug } from '@/modules/pessoas/pessoas.service'
import {
  listarMovimentacoes,
  criarMovimentacao,
} from '@/modules/movimentacoes/movimentacoes.service'
import { CriarMovimentacaoSchema, NenhumaPendenteError } from '@/modules/movimentacoes/movimentacoes.types'

export async function GET(req: NextRequest): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
  if (!session) return forbidden()

  const limit = parseInt(new URL(req.url).searchParams.get('limit') ?? '50')
  const tenantId = session.role === 'super_admin' ? null : session.tenantId!

  try {
    const data = await listarMovimentacoes(tenantId, limit)
    return ok(data)
  } catch {
    return serverError('listarMovimentacoes failed')
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const parsed = CriarMovimentacaoSchema.safeParse(await req.json())
  if (!parsed.success) {
    return badRequest(JSON.stringify(parsed.error.flatten().fieldErrors))
  }

  // Aceita requests autenticados e não autenticados (terminal público)
  const session = await verifyAuth(req)
  let tenantId = session?.tenantId ?? null

  if (!tenantId && parsed.data.tenantSlug) {
    const tenant = await resolverTenantPorSlug(parsed.data.tenantSlug)
    if (!tenant) return notFound('Tenant')
    tenantId = tenant.id
  }

  if (!tenantId) return forbidden()

  try {
    const mov = await criarMovimentacao(tenantId, parsed.data.pessoaId, parsed.data.tipo)
    return created(mov)
  } catch (error) {
    if (error instanceof NenhumaPendenteError) return badRequest(error.message)
    return serverError('criarMovimentacao failed')
  }
}
