'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { OcorrenciaCard } from '@/components/ui/ronda/OcorrenciaCard'
import type { RegistroAmbiente } from '@/services/rondas.types'

interface GrupoAmbientesProps {
  titulo: string
  ambientes: RegistroAmbiente[]
  variante: 'normal' | 'ocorrencia'
}

export function GrupoAmbientes({ titulo, ambientes, variante }: GrupoAmbientesProps) {
  const [aberto, setAberto] = useState(false)

  const estilos =
    variante === 'normal'
      ? {
          border: 'border-emerald-300',
          header: 'bg-emerald-600 text-white',
          badge: 'bg-emerald-500 text-white',
          chevron: 'text-white',
        }
      : {
          border: 'border-amber-300',
          header: 'bg-amber-500 text-white',
          badge: 'bg-amber-400 text-white',
          chevron: 'text-white',
        }

  if (ambientes.length === 0) return null

  return (
    <div className={`rounded-xl border ${estilos.border} overflow-hidden`}>
      <button
        className={`w-full flex items-center justify-between px-3 py-2.5 text-left ${estilos.header}`}
        onClick={() => setAberto((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold font-sans">{titulo}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold font-sans ${estilos.badge}`}>
            {ambientes.length}
          </span>
        </div>
        {aberto
          ? <ChevronUp className={`w-4 h-4 shrink-0 ${estilos.chevron}`} />
          : <ChevronDown className={`w-4 h-4 shrink-0 ${estilos.chevron}`} />}
      </button>

      {aberto && (
        <div className="px-3 pb-3 pt-2 space-y-3">
          {ambientes.map((amb) => (
            <div
              key={amb.id}
              className={`rounded-xl border px-3 py-2.5 space-y-2 ${amb.temOcorrencia ? 'border-orange-200 bg-white' : 'border-gray-100 bg-white'}`}
            >
              {/* Nome do ambiente + horário */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm font-semibold font-sans text-dark">{amb.ambiente}</span>
                {amb.concluidoEm && (
                  <span className="text-xs text-gray-400 font-sans">
                    {format(new Date(amb.concluidoEm), 'HH:mm', { locale: ptBR })}
                  </span>
                )}
              </div>

              {/* Ocorrências */}
              {amb.temOcorrencia && amb.ocorrencias.length > 0 ? (
                <div className="space-y-2">
                  {amb.ocorrencias.map((oc) => (
                    <OcorrenciaCard key={oc.id} oc={oc} />
                  ))}
                </div>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-green-100 text-green-700 inline-block">
                  Normal
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
