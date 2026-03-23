'use client'

import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react'
import Card from '@/components/card'
import Button from '@/components/button'
import Text from '@/components/text'
import { BLOCOS_AMBIENTES, type Etapa } from '@/app/[tenantSlug]/manutencao/ocorrencias/types'

interface BlocoIntroProps {
  blocoIdx: number
  setEtapa: (etapa: Etapa) => void
  setBlocoIdx: React.Dispatch<React.SetStateAction<number>>
}

export default function BlocoIntro({ blocoIdx, setEtapa, setBlocoIdx }: BlocoIntroProps) {
  const blocoAtual = BLOCOS_AMBIENTES[blocoIdx]

  return (
    <Card shadow="md">
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: '#0f766e' }}
        >
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <div>
          <Text as="h2" variant="heading-sm" className="text-dark block">
            {blocoAtual.bloco}
          </Text>
          <Text variant="body-sm" className="text-gray-300 block">
            {blocoAtual.ambientes.length} ambiente
            {blocoAtual.ambientes.length !== 1 ? 's' : ''} neste bloco
          </Text>
        </div>
      </div>

      <div className="space-y-1.5 mb-6 max-h-60 overflow-y-auto pr-1">
        {blocoAtual.ambientes.map((a, i) => (
          <div
            key={a}
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100"
          >
            <span className="text-xs text-gray-300 font-sans w-5 shrink-0 text-right">{i + 1}</span>
            <span className="text-sm font-sans text-dark">{a}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        {blocoIdx > 0 && (
          <Button
            variant="outline"
            onClick={() => { setBlocoIdx((i) => i - 1); setEtapa('bloco_resumo') }}
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4" /> Bloco anterior
          </Button>
        )}
        <Button onClick={() => setEtapa('ocorrencia_pergunta')} className="flex-1">
          Começar bloco <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
