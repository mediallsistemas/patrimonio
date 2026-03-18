import Link from 'next/link'
import { GiClothes } from 'react-icons/gi'
import { TbFaceId } from 'react-icons/tb'
import { ArrowDownToLine, RotateCcw } from 'lucide-react'
import Text from '@/components/text'
import FaceApiPreloader from '@/components/face-api-preloader'

export default async function HotelariaHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params

  const actions = [
    {
      href: `/${tenantSlug}/hotelaria/retirada`,
      icon: ArrowDownToLine,
      title: 'Fazer Retirada',
      description: 'Retire roupas do estoque com reconhecimento facial',
      color: '#FF7F50',
    },
    {
      href: `/${tenantSlug}/hotelaria/devolucao`,
      icon: RotateCcw,
      title: 'Fazer Devolução',
      description: 'Registre a devolução de roupas ao estoque',
      color: '#2563eb',
    },
    {
      href: `/${tenantSlug}/hotelaria/cadastro`,
      icon: TbFaceId,
      title: 'Criar Cadastro',
      description: 'Cadastre um novo funcionário com Face ID',
      color: '#22c55e',
    },
  ]

  return (
    <div className="form-bg min-h-screen flex flex-col items-center justify-center p-6">
      <FaceApiPreloader />
      <div className="w-full max-w-2xl">

        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ backgroundColor: '#FF7F50' }}
          >
            <GiClothes className="w-8 h-8 text-white" />
          </div>
          <Text as="h1" variant="heading-lg" className="text-dark mb-2 block">
            Hotelaria Hospitalar
          </Text>
          <Text variant="body-md" className="text-gray-300">
            Controle de retirada e devolução de enxoval
          </Text>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
