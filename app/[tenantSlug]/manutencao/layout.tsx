import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

const MANUTENCAO_ROLES = new Set(['super_admin', 'manutencao_admin', 'manutencao_user', 'tenant_admin', 'operator'])

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

  // super_admin pode acessar qualquer tenant
  if (session.role !== 'super_admin' && session.tenantSlug !== tenantSlug) {
    redirect(session.tenantSlug ? `/${session.tenantSlug}/manutencao` : '/login')
  }

  return <>{children}</>
}
