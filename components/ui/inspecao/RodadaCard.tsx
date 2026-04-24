'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { GrupoAmbientesInspecao } from '@/components/ui/inspecao/GrupoAmbientesInspecao'
import type { RodadaInspecao } from '@/services/inspecao.types'

export function RodadaCard({ rodada }: { rodada: RodadaInspecao }) {
  const [aberto, setAberto] = useState(false)
  const normais    = rodada.ambientes.filter((a) => !a.temAlteracao)
  const ocorrencias = rodada.ambientes.filter((a) => a.temAlteracao)
  const total = rodada.ambientes.length

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-4 text-left"
        onClick={() => setAberto((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold font-sans text-dark text-sm">
              {format(new Date(rodada.iniciadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
            {ocorrencias.length > 0 ? (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-orange-100 text-orange-700">
                {ocorrencias.length} ocorrência{ocorrencias.length > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-green-100 text-green-700">
                Tudo normal
              </span>
            )}
          </div>
          <span className="text-xs text-gray-300 font-sans">
            {total} ambiente{total !== 1 ? 's' : ''} inspecionado{total !== 1 ? 's' : ''}
            {rodada.finalizadoEm && (
              <> · {Math.round((new Date(rodada.finalizadoEm).getTime() - new Date(rodada.iniciadoEm).getTime()) / 60000)} min</>
            )}
          </span>
        </div>
        {aberto ? <ChevronUp className="w-4 h-4 text-gray-300 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-300 shrink-0" />}
      </button>

      {aberto && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
          <GrupoAmbientesInspecao titulo="Conformidade" ambientes={normais}    variante="normal" />
          <GrupoAmbientesInspecao titulo="Ocorrências"  ambientes={ocorrencias} variante="ocorrencia" />
        </div>
      )}
    </div>
  )
}
