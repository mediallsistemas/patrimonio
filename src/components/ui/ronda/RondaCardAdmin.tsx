'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { AmbienteOcorrenciaRow } from '@/components/ui/ronda/AmbienteOcorrenciaRow'
import { StatusBadge } from '@/components/ui/ronda/StatusBadge'
import type { Ronda } from '@/services/rondas.types'

export function RondaCardAdmin({ ronda }: { ronda: Ronda }) {
  const comOcorrencia = ronda.ambientes.filter((a) => a.temOcorrencia)
  const normais = ronda.ambientes.filter((a) => !a.temOcorrencia)
  const [verNormais, setVerNormais] = useState(false)

  const duracao = ronda.finalizadoEm
    ? Math.round(
        (new Date(ronda.finalizadoEm).getTime() - new Date(ronda.iniciadoEm).getTime()) / 60000,
      )
    : null

  return (
    <div
      className={`rounded-2xl border overflow-hidden bg-white ${
        comOcorrencia.length > 0 ? 'border-orange-200' : 'border-gray-100 shadow-sm'
      }`}
    >
      {/* Cabeçalho sempre visível */}
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {ronda.tenant && (
              <span className="text-xs font-semibold font-sans px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                {ronda.tenant.nome}
              </span>
            )}
            <StatusBadge ronda={ronda} />
          </div>
          <p className="text-sm font-semibold font-sans text-gray-800">
            {format(new Date(ronda.iniciadoEm), "dd/MM 'às' HH:mm", { locale: ptBR })}
            {duracao !== null && (
              <span className="font-normal text-gray-400 ml-2">· {duracao} min</span>
            )}
          </p>
          <p className="text-xs text-gray-400 font-sans mt-0.5">
            {ronda.ambientes.length} ambiente{ronda.ambientes.length !== 1 ? 's' : ''}
            {ronda.criadoPor && ` · ${ronda.criadoPor.nome}`}
          </p>
        </div>
      </div>

      {/* Ambientes com ocorrência — sempre visíveis */}
      {comOcorrencia.length > 0 && (
        <div className="border-t border-orange-100 px-4 py-3 space-y-2">
          {comOcorrencia.map((amb) => (
            <AmbienteOcorrenciaRow key={amb.id} ambiente={amb} />
          ))}
        </div>
      )}

      {/* Ambientes normais — colapsados discretamente */}
      {normais.length > 0 && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setVerNormais((v) => !v)}
            className="w-full px-4 py-2 flex items-center justify-between text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span>
              {normais.length} ambiente{normais.length !== 1 ? 's' : ''} em conformidade
            </span>
            {verNormais
              ? <ChevronUp className="w-3.5 h-3.5" />
              : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {verNormais && (
            <div className="px-4 pb-3 grid grid-cols-2 gap-1.5">
              {normais.map((amb) => (
                <div
                  key={amb.id}
                  className="text-xs font-sans text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5"
                >
                  {amb.ambiente}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
