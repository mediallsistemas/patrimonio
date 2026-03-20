import { verifyAuth } from '@/modules/auth/auth.guards'
import { prisma } from '@/lib/db'
import { ok, unauthorized, serverError } from '@/lib/api-response'

// GET /api/tenants — lista todos os tenants (super_admin)
export async function GET(req: Request) {
  try {
    const session = await verifyAuth(req, ['super_admin'])
    if (!session) return unauthorized()

    const tenants = await prisma.tenant.findMany({
      where: { ativo: true },
      select: { id: true, slug: true, nome: true, logoUrl: true, ativo: true },
      orderBy: { nome: 'asc' },
    })

    // Mapeia para o formato esperado pela SPA (name em vez de nome)
    return ok(tenants.map((t) => ({
      id:      t.id,
      slug:    t.slug,
      name:    t.nome,
      logoUrl: t.logoUrl,
      active:  t.ativo,
    })))
  } catch (err) {
    return serverError(err)
  }
}
