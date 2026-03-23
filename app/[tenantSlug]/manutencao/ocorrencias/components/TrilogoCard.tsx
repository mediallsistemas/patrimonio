'use client'

import { ChevronLeft } from 'lucide-react'
import Card from '@/components/card'
import Button from '@/components/button'
import Text from '@/components/text'
import { BLOCOS_AMBIENTES, type Etapa } from '@/app/[tenantSlug]/manutencao/ocorrencias/types'

interface TrilogoCardProps {
  blocoIdx: number
  ambienteAtual: string
  submitting: boolean
  handleTrilogo: (trilogoChamado: boolean) => Promise<void>
  setEtapa: (etapa: Etapa) => void
}

export default function TrilogoCard({
  blocoIdx,
  ambienteAtual,
  submitting,
  handleTrilogo,
  setEtapa,
}: TrilogoCardProps) {
  const blocoAtual = BLOCOS_AMBIENTES[blocoIdx]

  return (
    <Card shadow="md">
      <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-1">
        {blocoAtual.bloco}
      </Text>
      <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
        Chamado no Trilogo
      </Text>
      <Text variant="body-sm" className="text-gray-300 mb-6 block">
        Foi aberto chamado para a ocorrência em <strong>{ambienteAtual}</strong>?
      </Text>
      <div className="grid grid-cols-2 gap-4 mb-4">
        {[
          { v: true,  label: 'Sim', color: 'border-green-400 bg-green-50 text-green-700', icon: '✅' },
          { v: false, label: 'Não', color: 'border-red-400 bg-red-50 text-red-700',       icon: '❌' },
        ].map(({ v, label, color, icon }) => (
          <button
            key={label}
            onClick={() => handleTrilogo(v)}
            disabled={submitting}
            className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 ${color} font-sans font-bold transition-all active:scale-95 disabled:opacity-50`}
          >
            <span className="text-3xl">{icon}</span>
            {label}
          </button>
        ))}
      </div>
      <Button variant="outline" onClick={() => setEtapa('ocorrencia_detalhe')} className="w-full">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </Button>
    </Card>
  )
}
