import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function ViewerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== 'viewer') redirect('/login')
  return <>{children}</>
}
