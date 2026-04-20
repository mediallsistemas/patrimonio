import { verifyAuth } from '@/modules/auth/auth.guards'
import { prisma } from '@/lib/db'
import { ok, forbidden, serverError, created, notFound, badRequest } from '@/lib/api-response'
import { z } from 'zod'

// GET /api/tenants/[slug]/ambientes — lista ambientes do tenant
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
  if (!session) return forbidden()

  const { slug } = await params

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!tenant) return notFound('Tenant')

    // tenant_admin só pode ver ambientes do próprio tenant
    if (session.role !== 'super_admin' && session.tenantId !== tenant.id) return forbidden()

    const ambientes = await prisma.ambienteTenant.findMany({
      where: { tenantId: tenant.id, ativo: true },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
      select: { id: true, nome: true, ordem: true, tipo: true },
    })

    return ok(ambientes)
  } catch (err) {
    console.error('[tenants/ambientes] GET:', err)
    return serverError('listarAmbientes failed')
  }
}

const CreateAmbienteSchema = z.object({
  nome: z.string().min(1).max(120),
  ordem: z.number().int().min(0).optional(),
  tipo: z.enum(['ocorrencia', 'gases']).default('ocorrencia'),
})

// POST /api/tenants/[slug]/ambientes — cria ambiente no tenant
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
  if (!session) return forbidden()

  const { slug } = await params

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!tenant) return notFound('Tenant')

    if (session.role !== 'super_admin' && session.tenantId !== tenant.id) return forbidden()

    const parsed = CreateAmbienteSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest(JSON.stringify(parsed.error.flatten().fieldErrors))

    const ambiente = await prisma.ambienteTenant.create({
      data: {
        tenantId: tenant.id,
        nome: parsed.data.nome,
        ordem: parsed.data.ordem ?? 0,
        tipo: parsed.data.tipo,
      },
    })

    return created(ambiente)
  } catch (err) {
    console.error('[tenants/ambientes] POST:', err)
    return serverError('criarAmbiente failed')
  }
}
