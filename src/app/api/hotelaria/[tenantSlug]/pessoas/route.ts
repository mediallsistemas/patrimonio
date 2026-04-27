import { NextRequest } from 'next/server'
import { created, badRequest, notFound, conflict, serverError } from '@/lib/api-response'
import { buscarTenantPorSlug } from '@/modules/tenants/tenants.service'
import { criarPessoa } from '@/modules/pessoas/pessoas.service'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> },
): Promise<Response> {
  const { tenantSlug } = await params
  const { nome, cpf, faceDescriptor } = await req.json()

  if (!nome || !cpf || !faceDescriptor) return badRequest('Dados incompletos')

  const cpfLimpo = String(cpf).replace(/\D/g, '')
  if (cpfLimpo.length !== 11) return badRequest('CPF inválido')

  try {
    const tenant = await buscarTenantPorSlug(tenantSlug)
    if (!tenant) return notFound('Tenant')

    const result = await criarPessoa({ nome: String(nome).trim(), cpf: cpfLimpo, faceDescriptor }, tenant.id)
    if (result.conflict) return conflict('CPF já cadastrado')

    return created({ id: result.pessoa.id, nome: result.pessoa.nome, cpf: result.pessoa.cpf })
  } catch {
    return serverError('criarPessoa failed')
  }
}
