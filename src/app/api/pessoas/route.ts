import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, created, badRequest, conflict, forbidden, notFound, serverError } from '@/lib/api-response'
import { CreatePessoaSchema } from '@/modules/pessoas/pessoas.types'
import * as pessoasService from '@/modules/pessoas/pessoas.service'

export async function GET(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
  if (!session) return forbidden()

  const tenantId = session.role === 'super_admin' ? null : session.tenantId!

  try {
    const pessoas = await pessoasService.listarPessoas(tenantId)
    return ok(pessoas)
  } catch {
    return serverError('listarPessoas failed')
  }
}

export async function POST(req: Request): Promise<Response> {
  const parsed = CreatePessoaSchema.safeParse(await req.json())
  if (!parsed.success) return badRequest(JSON.stringify(parsed.error.flatten().fieldErrors))

  const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
  let tenantId: string | null = session?.tenantId ?? null

  // Permite cadastro público via tenantSlug (ex: terminais de hotelaria sem login)
  if (!tenantId && parsed.data.tenantSlug) {
    const tenant = await pessoasService.resolverTenantPorSlug(parsed.data.tenantSlug)
    if (!tenant) return notFound('Tenant')
    tenantId = tenant.id
  }

  if (!tenantId) return forbidden()

  try {
    const result = await pessoasService.criarPessoa(parsed.data, tenantId)
    if (result.conflict) return conflict('CPF já cadastrado')
    return created({ id: result.pessoa.id, nome: result.pessoa.nome, cpf: result.pessoa.cpf })
  } catch {
    return serverError('criarPessoa failed')
  }
}
