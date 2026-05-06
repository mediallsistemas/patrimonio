import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Activity, Users, Package, ShieldCheck, Wrench } from 'lucide-react'
import Text from '@/components/ui/Text'
import LogoutButton from '@/components/ui/LogoutButton'
import { getSession } from '@/lib/auth'

const ACTIONS = [
  {
    href: '/viewer/rondas',
    icon: Activity,
    title: 'Monitoramento de Rondas',
    description: 'Visualize histórico de inspeções e ocorrências das unidades vinculadas',
    color: '#059669',
  },
  {
    href: '/viewer/usuarios',
    icon: Users,
    title: 'Usuários',
    description: 'Consulte os usuários das unidades vinculadas',
    color: '#0369a1',
  },
  {
    href: '/viewer/bens',
    icon: Package,
    title: 'Bens Patrimoniais',
    description: 'Visualize o patrimônio cadastrado no Trílogo por unidade e ambiente',
    color: '#7c3aed',
  },
  {
    href: '/viewer/patrimonio',
    icon: Wrench,
    title: 'Tickets de Manutenção',
    description: 'Visualize tickets de manutenção com bens patrimoniais via Trílogo',
    color: '#b45309',
  },
]

export default async function ViewerHomePage() {
  const session = await getSession()
  if (!session || session.role !== 'viewer') redirect('/login')

  return (
    <div className="form-bg min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-3xl">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold font-sans text-gray-400 uppercase tracking-wide">
              Admin Regional
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300 font-sans hidden sm:block">{session.nome}</span>
            <LogoutButton />
          </div>
        </div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-5">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <Text as="h1" variant="heading-lg" className="text-dark mb-2 block">
            Painel Admin
          </Text>
          <Text variant="body-md" className="text-gray-300">
            Acesso às unidades vinculadas
          </Text>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ACTIONS.map(({ href, icon: Icon, title, description, color }) => (
            <Link key={href} href={href} className="group">
              <div
                className="bg-white rounded-2xl border border-gray-200 shadow-sm group-hover:shadow-md transition-all duration-200 p-6 h-full flex flex-col border-t-4"
                style={{ borderTopColor: color }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: color }}>
                  <Icon className="text-white w-6 h-6" />
                </div>
                <Text as="h2" variant="heading-sm" className="text-dark mb-1.5 block">{title}</Text>
                <Text variant="body-sm" className="text-gray-300 flex-1 block">{description}</Text>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
