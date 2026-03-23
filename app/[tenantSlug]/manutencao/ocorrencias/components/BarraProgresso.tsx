'use client'

import { BLOCOS_AMBIENTES, type AmbienteConcluido } from '@/app/[tenantSlug]/manutencao/ocorrencias/types'
import Text from '@/components/text'

interface BarraProgressoProps {
  blocoIdx: number
  totalBlocos: number
  progressoPct: number
  blocoAtual: (typeof BLOCOS_AMBIENTES)[0]
  concluidos: AmbienteConcluido[]
}

export default function BarraProgresso({
  blocoIdx,
  totalBlocos,
  progressoPct,
  blocoAtual,
  concluidos,
}: BarraProgressoProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-sans text-gray-300">
        <span>
          Bloco {blocoIdx + 1} de {totalBlocos}
          {' · '}
          <span className="font-semibold text-dark">{blocoAtual.bloco}</span>
        </span>
        <span>{progressoPct}%</span>
      </div>
      <div className="flex gap-1">
        {BLOCOS_AMBIENTES.map((b, i) => {
          const feito   = i < blocoIdx
          const comOcor = concluidos.some((c) => c.blocoIdx === i && c.temOcorrencia)
          const atual   = i === blocoIdx
          return (
            <div
              key={b.bloco}
              title={b.bloco}
              className={`flex-1 h-2 rounded-full transition-all ${
                feito  ? comOcor ? 'bg-orange-400' : 'bg-green-500'
                : atual ? 'bg-teal-600'
                :         'bg-gray-200'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}
