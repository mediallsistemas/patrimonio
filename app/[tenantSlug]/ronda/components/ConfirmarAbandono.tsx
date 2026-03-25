import { LogOut } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'

interface Props {
  onAbandonar: () => void
  onContinuar: () => void
}

export default function ConfirmarAbandono({ onAbandonar, onContinuar }: Props) {
  return (
    <Card shadow="md">
      <div className="flex flex-col items-center gap-3 py-2 mb-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
          <LogOut className="w-6 h-6 text-amber-600" />
        </div>
        <div className="text-center">
          <Text as="h2" variant="heading-sm" className="text-dark block mb-1">
            Pausar ronda?
          </Text>
          <Text variant="body-sm" className="text-gray-300 block">
            A ronda ficará salva. Você pode continuar de onde parou quando voltar.
          </Text>
        </div>
      </div>
      <div className="space-y-2">
        <Button onClick={onAbandonar} className="w-full">
          <LogOut className="w-4 h-4" /> Pausar e sair
        </Button>
        <Button variant="outline" onClick={onContinuar} className="w-full">
          Continuar ronda
        </Button>
      </div>
    </Card>
  )
}
