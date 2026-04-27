import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const session = await getSession()

  if (!session) redirect('/login')

  // super_admin pode acessar qualquer tenant
  if (session.role !== 'super_admin' && session.tenantSlug !== tenantSlug) {
    redirect(session.tenantSlug ? `/${session.tenantSlug}` : '/login')
  }

  return <>{children}</>
}
