import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session || (session.role !== 'super_admin' && session.role !== 'tenant_admin')) {
    redirect('/login')
  }

  // tenant_admin não pode acessar /admin/tenants
  // (proteção extra além do middleware, para SSR)

  return <>{children}</>
}
