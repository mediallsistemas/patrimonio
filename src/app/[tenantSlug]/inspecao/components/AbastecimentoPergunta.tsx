import { Package, BatteryFull, BatteryLow, X } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'

interface Props {
  ambiente: string
  backupLigado: boolean | null
  onSim: () => void
  onNao: () => void
  onVoltar: () => void
}

export default function AbastecimentoPergunta({ ambiente, backupLigado, onSim, onNao, onVoltar }: Props) {
  return (
    <Card shadow="md">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-sky-100">
          <Package className="w-5 h-5 text-sky-600" />
        </div>
        <div>
          <Text as="h2" variant="heading-sm" className="text-dark block">
            Abastecimento de Cilindros
          </Text>
          <Text variant="body-sm" className="text-gray-300 block">
            Houve abastecimento de cilindros em {ambiente}?
          </Text>
        </div>
      </div>

      {backupLigado !== null && (
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-4 ${backupLigado ? 'bg-green-50' : 'bg-red-50'}`}>
          {backupLigado
            ? <BatteryFull className="w-4 h-4 text-green-600 shrink-0" />
            : <BatteryLow className="w-4 h-4 text-red-600 shrink-0" />}
          <span className={`text-sm font-sans font-semibold ${backupLigado ? 'text-green-700' : 'text-red-700'}`}>
            Backup: {backupLigado ? 'Ligado' : 'Desligado'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <button onClick={onSim}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-700 font-sans font-bold transition-all active:scale-95">
          <Package className="w-8 h-8" />
          Sim
        </button>
        <button onClick={onNao}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-600 font-sans font-bold transition-all active:scale-95">
          <X className="w-8 h-8" />
          Não
        </button>
      </div>

      <Button variant="outline" onClick={onVoltar} className="w-full">
        Voltar
      </Button>
    </Card>
  )
}
