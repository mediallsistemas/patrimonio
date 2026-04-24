'use client'

import { AlertTriangle, CheckCircle, ChevronLeft } from 'lucide-react'
import Card from '@/components/ui/Card'
import Text from '@/components/ui/Text'
import type { DraftEstado } from '@/app/ocorrencias/types'

interface OcorrenciaPerguntaProps {
  estado: DraftEstado
  submitting: boolean
  salvarLocal: (temOcorrencia: boolean) => Promise<void>
  atualizar: (parcial: Partial<DraftEstado>) => void
}

export default function OcorrenciaPergunta({
  estado,
  submitting,
  salvarLocal,
  atualizar,
}: OcorrenciaPerguntaProps) {
  return (
    <Card shadow="md">
      <div className="flex items-center gap-3 mb-1">
        <button
          onClick={() => atualizar({ etapa: 'locais', localSelecionado: null })}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-dark hover:bg-gray-100 transition-colors shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block">
          {estado.blocoSelecionado}
        </Text>
      </div>
      <Text as="h2" variant="heading-sm" className="text-dark mb-1 block px-1">
        {estado.localSelecionado!.nome}
      </Text>
      <Text variant="body-sm" className="text-gray-300 mb-5 block px-1">
        Teve algum tipo de alteração neste local?
      </Text>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => salvarLocal(false)}
          disabled={submitting}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-green-300 bg-green-50 hover:bg-green-100 text-green-700 font-sans font-bold transition-all active:scale-95 disabled:opacity-50"
        >
          <CheckCircle className="w-8 h-8" /> Não
        </button>
        <button
          onClick={() => atualizar({ etapa: 'ocorrencia_detalhe' })}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 font-sans font-bold transition-all active:scale-95"
        >
          <AlertTriangle className="w-8 h-8" /> Sim
        </button>
      </div>
    </Card>
  )
}
