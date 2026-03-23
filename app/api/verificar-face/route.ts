import { NextRequest } from 'next/server'

import { badRequest, notFound, ok, serverError } from '@/lib/api-response'
import { buscarPessoasParaFaceMatch, resolverTenantPorSlug } from '@/modules/pessoas/pessoas.service'
import { encontrarMelhorMatch, buscarPendentes } from '@/modules/face-match/face-match.service'
import { VerificarFaceSchema } from '@/modules/face-match/face-match.types'

export async function POST(req: NextRequest): Promise<Response> {
  const parsed = VerificarFaceSchema.safeParse(await req.json())
  if (!parsed.success) {
    return badRequest(JSON.stringify(parsed.error.flatten().fieldErrors))
  }

  const { descriptor, tenantSlug } = parsed.data

  let tenantId: string | null = null
  if (tenantSlug) {
    const tenant = await resolverTenantPorSlug(tenantSlug)
    if (!tenant) return notFound('Tenant')
    tenantId = tenant.id
  }

  try {
    const pessoas = await buscarPessoasParaFaceMatch(tenantId)
    const match = encontrarMelhorMatch(descriptor, pessoas)

    if (!match) return ok({ encontrado: false })

    const pendentes = await buscarPendentes(match.id, tenantId ?? undefined)

    return ok({
      encontrado: true,
      pessoa: { id: match.id, nome: match.nome, cpf: match.cpf, criadoEm: match.criadoEm },
      pendentes,
    })
  } catch {
    return serverError('verificarFace failed')
  }
}
