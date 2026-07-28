import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { podeVerRelatorio } from '@/modules/manutencoes/manutencoes.rules'

/**
 * Relatório de Manutenções — visão de gestão.
 *
 * O layout pai (../layout.tsx) admite o operador no módulo de manutenção; aqui ele é
 * barrado especificamente deste relatório. Esconder o card em ../page.tsx não basta:
 * sem este guard, digitar a URL abriria a tela normalmente.
 */
export default async function HistoricoManutencaoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const session = await getSession()

  if (!session) redirect('/login')

  if (!podeVerRelatorio(session.role)) {
    redirect(`/${tenantSlug}/manutencao`)
  }

  return <>{children}</>
}
