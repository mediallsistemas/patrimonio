import { CheckCircle, Package } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'
import type { Medicoes, DadosAbastecimento } from '../inspecao.types'

interface Props {
  ambiente: string
  medicoes: Medicoes
  backupLigado: boolean | null
  abastecimento: DadosAbastecimento
  submitting: boolean
  onNao: () => void
  onSim: () => void
  onVoltar: () => void
}

export default function AlteracaoPergunta({ ambiente, medicoes, backupLigado, abastecimento, submitting, onNao, onSim, onVoltar }: Props) {
  return (
    <Card shadow="md">
      <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
        Teve alguma alteração?
      </Text>
      <Text variant="body-sm" className="text-gray-300 mb-4 block">
        Alguma ocorrência identificada na usina {ambiente}?
      </Text>

      <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
        <Text variant="caption" className="text-gray-300 uppercase tracking-wide block font-semibold">
          Resumo do ambiente
        </Text>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-sans">
          <span className="text-gray-400">Pureza O₂:</span>
          <span className="font-semibold text-dark">{medicoes.purezaO2}%</span>
          <span className="text-gray-400">Pressão O₂:</span>
          <span className="font-semibold text-dark">{medicoes.pressaoO2} bar</span>
          <span className="text-gray-400">Pressão Ar:</span>
          <span className="font-semibold text-dark">{medicoes.pressaoAr} bar</span>
          <span className="text-gray-400">Backup:</span>
          <span className={`font-semibold ${backupLigado ? 'text-green-600' : 'text-red-600'}`}>
            {backupLigado ? 'Ligado' : 'Desligado'}
          </span>
        </div>
      </div>

      {abastecimento.quantidade && abastecimento.tamanho && (
        <div className="bg-sky-50 rounded-xl p-3 mb-4 flex items-center gap-2">
          <Package className="w-4 h-4 text-sky-600 shrink-0" />
          <span className="text-sm font-sans text-sky-700">
            Abastecimento: <strong>{abastecimento.quantidade} cilindros {abastecimento.tamanho}</strong>
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <button onClick={onNao} disabled={submitting}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-green-300 bg-green-50 hover:bg-green-100 text-green-700 font-sans font-bold transition-all active:scale-95 disabled:opacity-50">
          <CheckCircle className="w-8 h-8" />
          Não
        </button>
        <button onClick={onSim}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 font-sans font-bold transition-all active:scale-95">
          <span className="text-3xl">⚠️</span>
          Sim
        </button>
      </div>

      <Button variant="outline" onClick={onVoltar} className="w-full">
        Voltar
      </Button>
    </Card>
  )
}
