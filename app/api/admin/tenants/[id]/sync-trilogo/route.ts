import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, forbidden, notFound, serverError } from '@/lib/api-response'
import { prisma } from '@/lib/db'
import { sincronizarAmbientesTrilogo } from '@/modules/ambientes/ambientes.service'

const TOKEN = process.env.TRILOGO_TOKEN ?? ''
const TRILOGO_BASE = process.env.TRILOGO_BASE_URL ?? 'https://public.api.trilogo.app/api'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin'])
  if (!session) return forbidden()

  const { id } = await params

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: { id: true, nome: true, trilogoCompanyId: true, trilogoProjectName: true },
    })
    if (!tenant) return notFound('Tenant')
    if (!tenant.trilogoCompanyId) return ok({ message: 'Tenant sem vínculo Trilogo', blocosCriados: 0, ambientesCriados: 0 })
    if (!TOKEN) return serverError('TRILOGO_TOKEN não configurado')

    const res = await fetch(`${TRILOGO_BASE}/asset`, {
      headers: { accept: 'application/json', token: TOKEN },
    })
    if (!res.ok) throw new Error('Trilogo assets error')

    const all = (await res.json()) as Record<string, unknown>[]

    // Filtra apenas os assets deste tenant (companyId + projectName)
    const assets = all.filter((a) => {
      if (Number(a['companyId']) !== tenant.trilogoCompanyId) return false
      if (!tenant.trilogoProjectName) return true
      const addr = String(a['departmentFullAddress'] ?? '').toUpperCase()
      return addr.includes(tenant.trilogoProjectName.toUpperCase())
    })

    const result = await sincronizarAmbientesTrilogo(tenant.id, assets)

    return ok({
      message: `Sincronizado: ${result.blocosCriados} blocos, ${result.ambientesCriados} ambientes criados`,
      ...result,
    })
  } catch {
    return serverError('sync-trilogo failed')
  }
}
