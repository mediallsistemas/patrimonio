import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { buscarTenantPorSlug } from '@/modules/tenants/tenants.service'
import ActiveTenantSync from '@/components/ActiveTenantSync'

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

  // super_admin acessa qualquer tenant; admin_multi (e viewer, alias legado)
  // acessa qualquer um dos seus tenants — a validação fina slug ∈ tenantIds
  // exigiria query extra aqui, então liberamos no layout e as páginas/APIs
  // filtram dados via tenantIds[] (resolveActiveTenantId valida o header).
  const isSuperAdmin = session.role === 'super_admin'
  const isAdminMulti = (session.role === 'admin_multi' || session.role === 'viewer') &&
    Array.isArray(session.tenantIds) && session.tenantIds.length > 0

  if (!isSuperAdmin && !isAdminMulti && session.tenantSlug !== tenantSlug) {
    redirect(session.tenantSlug ? `/${session.tenantSlug}` : '/login')
  }

  // Resolve o slug da URL para o tenantId e sincroniza a "unidade ativa" no cliente,
  // que será enviada como header x-tenant-id nas chamadas /me/* (ver services/api.ts).
  const tenant = await buscarTenantPorSlug(tenantSlug)

  return (
    <>
      {tenant && <ActiveTenantSync tenantId={tenant.id} />}
      {children}
    </>
  )
}
