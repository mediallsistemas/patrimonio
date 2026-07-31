import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  // Papéis administrativos — todos veem as mesmas telas; o alcance (quais
  // unidades) é aplicado no backend. viewer = alias legado de admin_multi.
  const ADMIN_PANEL_ROLES = new Set(['super_admin', 'tenant_admin', 'admin_multi', 'viewer'])
  if (!session || !ADMIN_PANEL_ROLES.has(session.role)) {
    redirect('/login')
  }

  return <>{children}</>
}
