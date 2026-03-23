'use client'

import { AlertTriangle, CheckCircle } from 'lucide-react'
import Card from '@/components/card'
import Text from '@/components/text'
import { BLOCOS_AMBIENTES, type AmbienteConcluido, type Etapa } from '@/app/[tenantSlug]/manutencao/ocorrencias/types'

interface OcorrenciaPerguntaProps {
  blocoIdx: number
  ambienteIdx: number
  ambienteAtual: string
  concluidosBloco: AmbienteConcluido[]
  submitting: boolean
  handleSemOcorrencia: () => Promise<void>
  setEtapa: (etapa: Etapa) => void
}

export default function OcorrenciaPergunta({
  blocoIdx,
  ambienteIdx,
  ambienteAtual,
  concluidosBloco,
  submitting,
  handleSemOcorrencia,
  setEtapa,
}: OcorrenciaPerguntaProps) {
  const blocoAtual = BLOCOS_AMBIENTES[blocoIdx]

  return (
    <Card shadow="md">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: '#0f766e' }}
        >
          <AlertTriangle className="w-5 h-5 text-white" />
        </div>
        <div>
          <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block">
            {blocoAtual.bloco} · {ambienteIdx + 1}/{blocoAtual.ambientes.length}
          </Text>
          <Text as="h2" variant="heading-sm" className="text-dark block">
            {ambienteAtual}
          </Text>
        </div>
      </div>

      <Text variant="body-sm" className="text-gray-300 mb-5 block">
        Teve algum tipo de alteração neste ambiente?
      </Text>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <button
          onClick={handleSemOcorrencia}
          disabled={submitting}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-green-300 bg-green-50 hover:bg-green-100 text-green-700 font-sans font-bold transition-all active:scale-95 disabled:opacity-50"
        >
          <CheckCircle className="w-8 h-8" /> Não
        </button>
        <button
          onClick={() => setEtapa('ocorrencia_detalhe')}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 font-sans font-bold transition-all active:scale-95"
        >
          <AlertTriangle className="w-8 h-8" /> Sim
        </button>
      </div>

      {concluidosBloco.length > 0 && (
        <div className="pt-3 border-t border-gray-100 space-y-1">
          <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-1.5">
            Concluídos neste bloco
          </Text>
          {concluidosBloco.map(({ ambiente, temOcorrencia }) => (
            <div key={ambiente} className="flex items-center gap-2 text-xs font-sans">
              <div className={`w-2 h-2 rounded-full shrink-0 ${temOcorrencia ? 'bg-orange-400' : 'bg-green-500'}`} />
              <span className="text-gray-400 flex-1 truncate">{ambiente}</span>
              <span className={`font-semibold shrink-0 ${temOcorrencia ? 'text-orange-600' : 'text-green-600'}`}>
                {temOcorrencia ? 'Ocorrência' : 'Normal'}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
