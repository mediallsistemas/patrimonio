'use client'

import { ChevronRight, FlaskConical } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Text from '@/components/ui/Text'
import type { DraftEstado } from '../ronda.types'

interface Props {
  estado: DraftEstado
  errors: Record<string, string>
  atualizar: (parcial: Partial<DraftEstado>) => void
  validarMedicoes: () => Record<string, string>
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
}

export default function GasesMedicoes({ estado, errors, atualizar, validarMedicoes, setErrors }: Props) {
  return (
    <Card shadow="md">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#7c3aed' }}>
          <FlaskConical className="w-5 h-5 text-white" />
        </div>
        <div>
          <Text as="h2" variant="heading-sm" className="text-dark block">Medições de Gases</Text>
          <Text variant="body-sm" className="text-gray-300 block">{estado.localSelecionado!.nome}</Text>
        </div>
      </div>
      <div className="space-y-4">
        <Input label="% Pureza O₂" type="number" step="0.1" min="0" max="100" placeholder="Ex: 93.5"
          value={estado.medicoes.purezaO2}
          onChange={(e) => atualizar({ medicoes: { ...estado.medicoes, purezaO2: e.target.value } })}
          error={errors.purezaO2} />
        <Input label="Pressão O₂ na rede (bar)" type="number" step="0.1" placeholder="Ex: 4.5"
          value={estado.medicoes.pressaoO2}
          onChange={(e) => atualizar({ medicoes: { ...estado.medicoes, pressaoO2: e.target.value } })}
          error={errors.pressaoO2} />
        <Input label="Pressão Ar Medicinal na rede (bar)" type="number" step="0.1" placeholder="Ex: 5.0"
          value={estado.medicoes.pressaoAr}
          onChange={(e) => atualizar({ medicoes: { ...estado.medicoes, pressaoAr: e.target.value } })}
          error={errors.pressaoAr} />
      </div>
      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={() => atualizar({ etapa: 'locais', localSelecionado: null })} className="flex-1">
          Voltar
        </Button>
        <Button onClick={() => {
          const e = validarMedicoes()
          if (Object.keys(e).length > 0) { setErrors(e); return }
          atualizar({ etapa: 'gases_backup' })
        }} className="flex-1">
          Continuar <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
