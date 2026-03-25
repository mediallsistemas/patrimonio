import { BatteryFull, BatteryLow } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'

interface Props {
  nomeAmbiente: string
  medicoes: { purezaO2: string; pressaoO2: string; pressaoAr: string }
  onSim: () => void
  onNao: () => void
  onVoltar: () => void
}

export default function GasesBackup({ nomeAmbiente, medicoes, onSim, onNao, onVoltar }: Props) {
  return (
    <Card shadow="md">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-100">
          <BatteryFull className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <Text as="h2" variant="heading-sm" className="text-dark block">Sistema de Backup</Text>
          <Text variant="body-sm" className="text-gray-300 block">
            O backup de {nomeAmbiente} está ligado?
          </Text>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 mb-5 grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-sans">
        <span className="text-gray-400">Pureza O₂:</span>
        <span className="font-semibold text-dark">{medicoes.purezaO2}%</span>
        <span className="text-gray-400">Pressão O₂:</span>
        <span className="font-semibold text-dark">{medicoes.pressaoO2} bar</span>
        <span className="text-gray-400">Pressão Ar:</span>
        <span className="font-semibold text-dark">{medicoes.pressaoAr} bar</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <button onClick={onSim}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-green-300 bg-green-50 hover:bg-green-100 text-green-700 font-sans font-bold transition-all active:scale-95">
          <BatteryFull className="w-8 h-8" /> Sim
        </button>
        <button onClick={onNao}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-sans font-bold transition-all active:scale-95">
          <BatteryLow className="w-8 h-8" /> Não
        </button>
      </div>

      <Button variant="outline" onClick={onVoltar} className="w-full">Voltar às medições</Button>
    </Card>
  )
}
