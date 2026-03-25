import { Package, ChevronRight } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Text from '@/components/ui/Text'
import { TAMANHOS_CILINDRO } from '../ronda.types'
import type { TamanhoCilindro } from '../ronda.types'

interface Props {
  abastecimento: { quantidade: string; tamanho: TamanhoCilindro | null }
  errors: Record<string, string>
  onChange: (v: { quantidade: string; tamanho: TamanhoCilindro | null }) => void
  onVoltar: () => void
  onContinuar: () => void
}

export default function GasesAbastecimentoDetalhe({ abastecimento, errors, onChange, onVoltar, onContinuar }: Props) {
  return (
    <Card shadow="md">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-sky-100">
          <Package className="w-5 h-5 text-sky-600" />
        </div>
        <Text as="h2" variant="heading-sm" className="text-dark block">Dados do Abastecimento</Text>
      </div>

      <div className="space-y-5">
        <Input label="Quantidade de cilindros" type="number" min="1" step="1" placeholder="Ex: 4"
          value={abastecimento.quantidade}
          onChange={(e) => onChange({ ...abastecimento, quantidade: e.target.value })}
          error={errors.quantidade} />

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-400 font-sans">Tamanho dos cilindros</label>
          <div className="grid grid-cols-4 gap-2">
            {TAMANHOS_CILINDRO.map((tam) => (
              <button key={tam} type="button"
                onClick={() => onChange({ ...abastecimento, tamanho: tam })}
                className={`py-3 rounded-xl border-2 font-sans font-bold text-sm transition-all active:scale-95 ${abastecimento.tamanho === tam ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-gray-200 text-gray-300 bg-white hover:border-gray-300'}`}>
                {tam}
              </button>
            ))}
          </div>
          {errors.tamanho && <span className="text-xs text-red-base font-sans">{errors.tamanho}</span>}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onVoltar} className="flex-1">Voltar</Button>
        <Button onClick={onContinuar} className="flex-1">
          Continuar <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
