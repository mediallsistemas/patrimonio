import { redirect } from 'next/navigation'

import { getSession } from '@/lib/auth'

const CHAMADOS_ROLES = new Set([
  'super_admin',
  'tenant_admin',
  'admin_multi',
  'operator',
  'operator_patrimonio',
  'viewer',
])

export default async function ChamadosLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const session = await getSession()

  if (!session) redirect('/login')

  if (!CHAMADOS_ROLES.has(session.role)) {
    redirect('/login')
  }

  // super_admin acessa qualquer tenant; admin_multi/viewer navegam entre as
  // suas unidades pelo slug (validação fina via tenantIds nas APIs).
  const isMulti = (session.role === 'admin_multi' || session.role === 'viewer') &&
    Array.isArray(session.tenantIds) && session.tenantIds.length > 0

  if (session.role !== 'super_admin' && !isMulti && session.tenantSlug !== tenantSlug) {
    redirect(session.tenantSlug ? `/${session.tenantSlug}/chamados` : '/login')
  }

  return <>{children}</>
}
