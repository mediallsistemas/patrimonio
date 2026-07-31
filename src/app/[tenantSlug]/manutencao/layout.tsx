import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

// admin_multi navega entre as unidades que administra (viewer = alias legado).
const MANUTENCAO_ROLES = new Set(['super_admin', 'manutencao_admin', 'manutencao_user', 'tenant_admin', 'admin_multi', 'viewer', 'operator'])

export default async function ManutencaoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const session = await getSession()

  if (!session) redirect('/login')

  if (!MANUTENCAO_ROLES.has(session.role)) {
    redirect('/login')
  }

  // super_admin acessa qualquer tenant; admin_multi/viewer acessam as suas
  // unidades (validação fina via tenantIds nas APIs — ver resolveActiveTenantId)
  const isMulti = (session.role === 'admin_multi' || session.role === 'viewer') &&
    Array.isArray(session.tenantIds) && session.tenantIds.length > 0

  if (session.role !== 'super_admin' && !isMulti && session.tenantSlug !== tenantSlug) {
    redirect(session.tenantSlug ? `/${session.tenantSlug}/manutencao` : '/login')
  }

  return <>{children}</>
}
