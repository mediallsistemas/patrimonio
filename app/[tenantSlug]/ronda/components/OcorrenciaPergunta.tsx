import { CheckCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'
import type { TipoRegistro } from '../ronda.types'

interface Props {
  nomeAmbiente: string
  tipoAmbiente: TipoRegistro
  submitting: boolean
  onNormal: () => void
  onOcorrencia: () => void
  onVoltar: () => void
}

export default function OcorrenciaPergunta({ nomeAmbiente, tipoAmbiente, submitting, onNormal, onOcorrencia, onVoltar }: Props) {
  return (
    <Card shadow="md">
      <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">{nomeAmbiente}</Text>
      <Text variant="body-sm" className="text-gray-300 mb-4 block">
        Alguma ocorrência identificada neste ambiente?
      </Text>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <button onClick={onNormal} disabled={submitting}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-green-300 bg-green-50 hover:bg-green-100 text-green-700 font-sans font-bold transition-all active:scale-95 disabled:opacity-50">
          <CheckCircle className="w-8 h-8" /> Normal
        </button>
        <button onClick={onOcorrencia}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 font-sans font-bold transition-all active:scale-95">
          <span className="text-3xl">⚠️</span> Ocorrência
        </button>
      </div>

      <Button variant="outline" onClick={onVoltar} className="w-full">
        {tipoAmbiente === 'gases' ? 'Voltar ao abastecimento' : 'Voltar'}
      </Button>
    </Card>
  )
}
