import { ClipboardList, Play, History } from 'lucide-react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'

interface Props {
  tenantSlug: string
  totalLocais: number
  loadingBlocos: boolean
  onIniciar: () => void
}

export default function TelaInicial({ tenantSlug, totalLocais, loadingBlocos, onIniciar }: Props) {
  return (
    <Card shadow="md">
      <div className="flex flex-col items-center gap-4 py-2 mb-5">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: '#0f766e' }}
        >
          <ClipboardList className="w-7 h-7 text-white" />
        </div>
        <div className="text-center">
          <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
            Ronda de Inspeção
          </Text>
          <Text variant="body-sm" className="text-gray-300 block">
            {loadingBlocos
              ? 'Carregando ambientes...'
              : `${totalLocais} ambiente${totalLocais !== 1 ? 's' : ''} para inspecionar`}
          </Text>
        </div>
      </div>

      <Button onClick={onIniciar} className="w-full" disabled={loadingBlocos || totalLocais === 0}>
        <Play className="w-4 h-4" /> Iniciar Ronda
      </Button>

      {totalLocais === 0 && !loadingBlocos && (
        <p className="text-center text-xs text-gray-300 font-sans mt-3">
          Nenhum ambiente cadastrado. Solicite ao administrador.
        </p>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100 text-center">
        <Link
          href={`/${tenantSlug}/ronda/historico`}
          className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-dark font-sans transition-colors"
        >
          <History className="w-4 h-4" /> Ver histórico de rondas
        </Link>
      </div>
    </Card>
  )
}
