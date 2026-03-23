import { verifyAuth } from '@/modules/auth/auth.guards'
import { prisma } from '@/lib/db'
import { noContent, ok, serverError, forbidden } from '@/lib/api-response'

export async function GET(req: Request): Promise<Response> {
  try {
    const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
    if (!session) return forbidden()

    const tenantId =
      session.role === 'super_admin'
        ? '00000000-0000-0000-0000-000000000001'
        : session.tenantId!

    const draft = await prisma.rondaDraft.findUnique({
      where: { tenantId_criadoPorId: { tenantId, criadoPorId: session.sub } },
    })

    return ok(draft)
  } catch (err) {
    return serverError(err)
  }
}

export async function PUT(req: Request): Promise<Response> {
  try {
    const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
    if (!session) return forbidden()

    const tenantId =
      session.role === 'super_admin'
        ? '00000000-0000-0000-0000-000000000001'
        : session.tenantId!

    const estado = await req.json()

    const draft = await prisma.rondaDraft.upsert({
      where: { tenantId_criadoPorId: { tenantId, criadoPorId: session.sub } },
      update: { estado },
      create: { tenantId, criadoPorId: session.sub, estado },
    })

    return ok(draft)
  } catch (err) {
    return serverError(err)
  }
}

export async function DELETE(req: Request): Promise<Response> {
  try {
    const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
    if (!session) return forbidden()

    const tenantId =
      session.role === 'super_admin'
        ? '00000000-0000-0000-0000-000000000001'
        : session.tenantId!

    await prisma.rondaDraft.deleteMany({
      where: { tenantId, criadoPorId: session.sub },
    })

    return noContent()
  } catch (err) {
    return serverError(err)
  }
}
