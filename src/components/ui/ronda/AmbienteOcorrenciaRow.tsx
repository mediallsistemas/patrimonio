'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { OcorrenciaCard } from '@/components/ui/ronda/OcorrenciaCard'
import { TIPO_OCORRENCIA } from '@/lib/ronda-tipos'
import type { RegistroAmbiente } from '@/services/rondas.types'

export function AmbienteOcorrenciaRow({ ambiente }: { ambiente: RegistroAmbiente }) {
  const [expandido, setExpandido] = useState(false)

  return (
    <div className="rounded-xl bg-orange-50 border border-orange-100 overflow-hidden">
      <button
        className="w-full px-3 py-2.5 flex items-center gap-2 text-left"
        onClick={() => setExpandido((v) => !v)}
      >
        <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
        <span className="text-sm font-semibold font-sans text-gray-800 flex-1 truncate">
          {ambiente.ambiente}
        </span>
        <div className="flex gap-1 flex-wrap justify-end">
          {ambiente.ocorrencias.map((oc) => (
            <span
              key={oc.id}
              className={`text-xs px-1.5 py-0.5 rounded-full font-semibold font-sans ${
                TIPO_OCORRENCIA[oc.tipo]?.color ?? 'bg-gray-100 text-gray-500'
              }`}
            >
              {TIPO_OCORRENCIA[oc.tipo]?.label ?? oc.tipo}
            </span>
          ))}
        </div>
        {expandido
          ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
      </button>

      {expandido && (
        <div className="px-3 pb-3 space-y-2 border-t border-orange-100">
          {ambiente.ocorrencias.map((oc) => (
            <OcorrenciaCard key={oc.id} oc={oc} />
          ))}
        </div>
      )}
    </div>
  )
}
