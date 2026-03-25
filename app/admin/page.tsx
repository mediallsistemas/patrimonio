import Link from 'next/link'
import { Building2, Users, ShieldCheck, Activity, LayoutDashboard, Package } from 'lucide-react'
import Text from '@/components/ui/Text'
import { getSession } from '@/lib/auth'
import LogoutButton from '@/components/ui/LogoutButton'

const actions = [
  {
    href: '/admin/tenants',
    icon: Building2,
    title: 'Unidades',
    description: 'Gerencie hospitais e unidades cadastradas no sistema',
    color: '#6366f1',
  },
  {
    href: '/admin/usuarios',
    icon: Users,
    title: 'Usuários',
    description: 'Gerencie contas de acesso e permissões dos usuários',
    color: '#0369a1',
  },
  {
    href: '/admin/rondas',
    icon: Activity,
    title: 'Monitoramento de Rondas',
    description: 'Visualize histórico de inspeções e ocorrências de todas as unidades',
    color: '#059669',
  },
  {
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard de Rouparia',
    description: 'Acompanhe retiradas, devoluções e pendências de rouparia em todas as unidades',
    color: '#f97316',
  },
  {
    href: '/admin/patrimonio',
    icon: Package,
    title: 'Tickets de Patrimônio',
    description: 'Visualize tickets de manutenção com bens patrimoniais vinculados via Trílogo',
    color: '#7c3aed',
  },
  {
    href: '/admin/bens',
    icon: Package,
    title: 'Bens por Ambiente',
    description: 'Consulte todos os bens patrimoniais cadastrados por setor e ambiente',
    color: '#0891b2',
  },
]

export default async function AdminPage() {
  const session = await getSession()

  return (
    <div className="form-bg min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-3xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#6366f1] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold font-sans text-gray-400 uppercase tracking-wide">
              Super Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300 font-sans hidden sm:block">{session?.nome}</span>
            <LogoutButton />
          </div>
        </div>

        {/* Título */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#6366f1] mb-5">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <Text as="h1" variant="heading-lg" className="text-dark mb-2 block">
            Painel de Administração
          </Text>
          <Text variant="body-md" className="text-gray-300">
            Gerencie o sistema, unidades e usuários
          </Text>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {actions.map(({ href, icon: Icon, title, description, color }) => (
            <Link key={href} href={href} className="group">
              <div
                className="bg-white rounded-2xl border border-gray-200 shadow-sm group-hover:shadow-md transition-all duration-200 p-6 h-full flex flex-col border-t-4"
                style={{ borderTopColor: color }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: color }}
                >
                  <Icon className="text-white w-6 h-6" />
                </div>
                <Text as="h2" variant="heading-sm" className="text-dark mb-1.5 block">
                  {title}
                </Text>
                <Text variant="body-sm" className="text-gray-300 flex-1 block">
                  {description}
                </Text>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}