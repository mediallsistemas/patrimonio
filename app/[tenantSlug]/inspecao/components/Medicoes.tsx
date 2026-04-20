import { FlaskConical, ChevronRight } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Text from '@/components/ui/Text'
import type { Medicoes as MedicoesState } from '../inspecao.types'

interface Props {
  ambiente: string
  medicoes: MedicoesState
  errors: Record<string, string>
  onChange: (m: MedicoesState) => void
  onClearError: (key: string) => void
  onNext: () => void
}

export default function Medicoes({ ambiente, medicoes, errors, onChange, onClearError, onNext }: Props) {
  return (
    <Card shadow="md">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#7c3aed' }}>
          <FlaskConical className="w-5 h-5 text-white" />
        </div>
        <div>
          <Text as="h2" variant="heading-sm" className="text-dark block">
            Medições — {ambiente}
          </Text>
          <Text variant="body-sm" className="text-gray-300 block">
            Registre os valores aferidos na usina
          </Text>
        </div>
      </div>

      <div className="space-y-4">
        <Input
          label="% Pureza O₂"
          type="number" step="0.1" min="0" max="100"
          placeholder="Ex: 93.5"
          value={medicoes.purezaO2}
          onChange={(e) => { onChange({ ...medicoes, purezaO2: e.target.value }); onClearError('purezaO2') }}
          error={errors.purezaO2}
        />
        <Input
          label="Pressão O₂ na rede (bar)"
          type="number" step="0.1"
          placeholder="Ex: 4.5"
          value={medicoes.pressaoO2}
          onChange={(e) => { onChange({ ...medicoes, pressaoO2: e.target.value }); onClearError('pressaoO2') }}
          error={errors.pressaoO2}
        />
        <Input
          label="Pressão Ar Medicinal na rede (bar)"
          type="number" step="0.1"
          placeholder="Ex: 5.0"
          value={medicoes.pressaoAr}
          onChange={(e) => { onChange({ ...medicoes, pressaoAr: e.target.value }); onClearError('pressaoAr') }}
          error={errors.pressaoAr}
        />
      </div>

      <Button onClick={onNext} className="w-full mt-6">
        Continuar <ChevronRight className="w-4 h-4" />
      </Button>
    </Card>
  )
}
