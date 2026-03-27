import { z } from 'zod'
import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, badRequest, unauthorized, serverError } from '@/lib/api-response'
import { criarOuBuscarLinkAmbiente } from '@/modules/links-publicos/links-publicos.service'

const BodySchema = z.object({
  companyId: z.number().int().positive(),
  projeto: z.string().min(1),
  ambiente: z.string().min(1),
})

export async function POST(req: Request): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
  if (!session) return unauthorized()

  const parsed = BodySchema.safeParse(await req.json())
  if (!parsed.success) return badRequest(JSON.stringify(parsed.error.flatten().fieldErrors))

  try {
    const id = await criarOuBuscarLinkAmbiente({
      ...parsed.data,
      tenantId: session.tenantId ?? 'super_admin',
    })
    return ok({ token: id })
  } catch {
    return serverError('link-publico POST failed')
  }
}
