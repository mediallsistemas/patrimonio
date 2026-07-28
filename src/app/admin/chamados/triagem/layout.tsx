import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

// A fila atravessa todas as unidades — mesma restrição da API que a alimenta
// (/api/admin/chamados/triagem e /api/admin/chamados/sincronizar são super_admin).
// Sem esta guarda o tenant_admin veria a tela e só descobriria o 403 ao carregar.
export default async function TriagemLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (session?.role !== 'super_admin') redirect('/admin')
  return <>{children}</>
}
