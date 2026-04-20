'use client'

import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Text from '@/components/ui/Text'
import type { DraftEstado } from '@/app/ocorrencias/types'

interface TrilogoCardProps {
  estado: DraftEstado
  submitting: boolean
  salvarLocal: (temOcorrencia: boolean, trilogoChamado: boolean) => Promise<void>
  atualizar: (parcial: Partial<DraftEstado>) => void
}

export default function TrilogoCard({ estado, submitting, salvarLocal, atualizar }: TrilogoCardProps) {
  return (
    <Card shadow="md">
      <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-1">
        {estado.blocoSelecionado}
      </Text>
      <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
        Chamado no Trilogo
      </Text>
      <Text variant="body-sm" className="text-gray-300 mb-6 block">
        Foi aberto chamado no Trilogo para a ocorrência em{' '}
        <strong>{estado.localSelecionado!.nome}</strong>?
      </Text>
      <div className="grid grid-cols-2 gap-4 mb-4">
        {[
          { v: true,  label: 'Sim', color: 'border-green-400 bg-green-50 text-green-700', icon: '✅' },
          { v: false, label: 'Não', color: 'border-red-400 bg-red-50 text-red-700',       icon: '❌' },
        ].map(({ v, label, color, icon }) => (
          <button
            key={label}
            onClick={() => salvarLocal(true, v)}
            disabled={submitting}
            className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 ${color} font-sans font-bold transition-all active:scale-95 disabled:opacity-50`}
          >
            <span className="text-3xl">{icon}</span>
            {label}
          </button>
        ))}
      </div>
      <Button variant="outline" onClick={() => atualizar({ etapa: 'ocorrencia_detalhe' })} className="w-full">
        Voltar
      </Button>
    </Card>
  )
}
