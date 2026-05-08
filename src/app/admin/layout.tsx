import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session || (session.role !== 'super_admin' && session.role !== 'tenant_admin' && session.role !== 'viewer')) {
    redirect('/login')
  }

  return <>{children}</>
}
