import Link from 'next/link'
import { BarChart3, FlaskConical, ClipboardList } from 'lucide-react'
import { GiClothes } from 'react-icons/gi'
import { TbFaceId } from 'react-icons/tb'
import Text from '@/components/ui/Text'

const actions = [
  {
    href: '/retirada',
    icon: GiClothes,
    title: 'Fazer Retirada',
    description: 'Retire roupas do estoque com reconhecimento facial',
    iconBg: 'bg-[#FF7F50]', // coral/laranja
    iconColor: 'text-white',
    accent: 'border-t-[#FF7F50]',
  },
  {
    href: '/devolucao',
    icon: GiClothes,
    title: 'Fazer Devolução',
    description: 'Registre a devolução de roupas ao estoque',
    iconBg: 'bg-[#2563eb]', // azul escuro bonito
    iconColor: 'text-white',
    accent: 'border-t-[#2563eb]',
  },
  {
    href: '/cadastro',
    icon: TbFaceId,
    title: 'Criar Cadastro',
    description: 'Cadastre um novo funcionário com Face ID',
    iconBg: 'bg-[#22c55e]',
    iconColor: 'text-white',
    accent: 'border-t-[#22c55e]',
  },
  {
    href: '/inspecao',
    icon: FlaskConical,
    title: 'Inspeção de Gases',
    description: 'Inspeção técnica da usina de gases medicinais',
    iconBg: 'bg-[#7c3aed]',
    iconColor: 'text-white',
    accent: 'border-t-[#7c3aed]',
  },
  {
    href: '/ocorrencias',
    icon: ClipboardList,
    title: 'Ocorrências',
    description: 'Registro de ocorrências em ambientes hospitalares',
    iconBg: 'bg-[#0f766e]',
    iconColor: 'text-white',
    accent: 'border-t-[#0f766e]',
  },
]

export default function Home() {
  return (
    <div className="form-bg min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FF7F50] mb-5">
            <GiClothes className="w-8 h-8 text-white" />
          </div>
          <Text as="h1" variant="heading-lg" className="text-dark mb-2 block">
            Sistema de Rouparia
          </Text>
          <Text variant="body-md" className="text-gray-300">
            Controle de retirada e devolução de enxoval hospitalar
          </Text>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {actions.map(({ href, icon: Icon, title, description, iconBg, iconColor, accent }) => (
            <Link key={href} href={href} className="group">
              <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm group-hover:shadow-md group-hover:border-red-base transition-all duration-200 p-6 h-full flex flex-col border-t-4 ${accent}`}>
                <div className={`${iconBg} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`${iconColor} w-6 h-6`} />
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

        {/* Dashboard link */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-red-base hover:text-red-dark transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            <Text variant="body-sm" className="text-inherit">
              Ver Dashboard
            </Text>
          </Link>
        </div>
      </div>
    </div>
  )
}
