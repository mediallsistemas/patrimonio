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
  // admin_multi é o nome atual do papel; 'viewer' segue só como alias legado
  // (o rename já rodou no Auth DB — sem admin_multi aqui, os admins regionais
  // tomavam 401 e o modal de QR só mostrava "Erro ao gerar QR").
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'operator_patrimonio', 'admin_multi', 'viewer'])
  if (!session) return unauthorized()

  const parsed = BodySchema.safeParse(await req.json())
  if (!parsed.success) return badRequest(JSON.stringify(parsed.error.flatten().fieldErrors))

  try {
    const id = await criarOuBuscarLinkAmbiente({
      ...parsed.data,
      tenantId: session.tenantId ?? 'super_admin',
    })
    return ok({ token: id })
  } catch (e) {
    console.error('[link-publico] POST error:', e)
    return serverError('link-publico POST failed')
  }
}
