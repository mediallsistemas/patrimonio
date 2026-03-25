import { FlaskConical, ChevronRight } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Text from '@/components/ui/Text'

interface Props {
  nomeAmbiente: string
  medicoes: { purezaO2: string; pressaoO2: string; pressaoAr: string }
  errors: Record<string, string>
  onChangeMedicoes: (medicoes: { purezaO2: string; pressaoO2: string; pressaoAr: string }) => void
  onVoltar: () => void
  onContinuar: () => void
}

export default function GasesMedicoes({ nomeAmbiente, medicoes, errors, onChangeMedicoes, onVoltar, onContinuar }: Props) {
  return (
    <Card shadow="md">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#7c3aed' }}>
          <FlaskConical className="w-5 h-5 text-white" />
        </div>
        <div>
          <Text as="h2" variant="heading-sm" className="text-dark block">
            Medições — {nomeAmbiente}
          </Text>
          <Text variant="body-sm" className="text-gray-300 block">Inspeção de Gases Medicinais</Text>
        </div>
      </div>

      <div className="space-y-4">
        <Input label="% Pureza O₂" type="number" step="0.1" min="0" max="100" placeholder="Ex: 93.5"
          value={medicoes.purezaO2} onChange={(e) => onChangeMedicoes({ ...medicoes, purezaO2: e.target.value })}
          error={errors.purezaO2} />
        <Input label="Pressão O₂ na rede (bar)" type="number" step="0.1" placeholder="Ex: 4.5"
          value={medicoes.pressaoO2} onChange={(e) => onChangeMedicoes({ ...medicoes, pressaoO2: e.target.value })}
          error={errors.pressaoO2} />
        <Input label="Pressão Ar Medicinal na rede (bar)" type="number" step="0.1" placeholder="Ex: 5.0"
          value={medicoes.pressaoAr} onChange={(e) => onChangeMedicoes({ ...medicoes, pressaoAr: e.target.value })}
          error={errors.pressaoAr} />
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
