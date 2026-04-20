import { FlaskConical, ChevronRight, History } from 'lucide-react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'

interface Props {
  ambiente: string
  tenantSlug: string
  onIniciar: () => void
}

export default function TelaInicio({ ambiente, tenantSlug, onIniciar }: Props) {
  return (
    <Card shadow="md">
      <div className="flex flex-col items-center gap-4 py-2 mb-5">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#7c3aed' }}>
          <FlaskConical className="w-7 h-7 text-white" />
        </div>
        <div className="text-center">
          <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
            Inspeção da Usina de Gases
          </Text>
          <Text variant="body-sm" className="text-gray-300 block">
            Inspeção do ambiente <strong>{ambiente}</strong>
          </Text>
        </div>
      </div>

      <Button onClick={onIniciar} className="w-full">
        Iniciar Inspeção
        <ChevronRight className="w-4 h-4" />
      </Button>

      <div className="mt-4 pt-4 border-t border-gray-100 text-center">
        <Link href={`/${tenantSlug}/inspecao/historico`} className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-red-base font-sans transition-colors">
          <History className="w-4 h-4" />
          Ver histórico de inspeções
        </Link>
      </div>
    </Card>
  )
}
