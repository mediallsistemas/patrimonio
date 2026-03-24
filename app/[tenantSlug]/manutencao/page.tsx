import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import { GiClothes } from 'react-icons/gi'
import Text from '@/components/text'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/logout-button'

export default async function ManutencaoHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  const actions = [
    {
      href: `/ocorrencias`,
      icon: ClipboardList,
      title: 'Ronda de Manutenção Predial',
      description: 'Ronda e registro de ocorrências em ambientes hospitalares',
      color: '#0f766e',
    },
  ]

  return (
    <div className="form-bg min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-3xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#0f766e' }}
            >
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold font-sans text-gray-400 uppercase tracking-wide">
              {tenantSlug} · Manutenção
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300 font-sans hidden sm:block">{session.nome}</span>
            <LogoutButton />
          </div>
        </div>

        {/* Título */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ backgroundColor: '#0f766e' }}
          >
            <ClipboardList className="w-8 h-8 text-white" />
          </div>
          <Text as="h1" variant="heading-lg" className="text-dark mb-2 block">
            Manutenção e Infraestrutura
          </Text>
          <Text variant="body-md" className="text-gray-300">
            Gestão de ocorrências e manutenção predial
          </Text>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-5">
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

        {/* Link p/ hotelaria */}
        <div className="mt-8 text-center">
          <Link
            href={`/${tenantSlug}/hotelaria`}
            className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-dark font-sans transition-colors"
          >
            <GiClothes className="w-4 h-4" />
            Ir para Hotelaria
          </Link>
        </div>

      </div>
    </div>
  )
}
