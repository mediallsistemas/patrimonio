'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { GrupoAmbientes } from '@/components/ui/ronda/GrupoAmbientes'
import type { Ronda } from '@/services/rondas.types'

interface RondaCardProps {
  ronda: Ronda
  mostrarTenant?: boolean
  mostrarDono?: boolean
  agruparAmbientes?: boolean
  renderAmbiente?: (ambienteId: string) => React.ReactNode
}

export function RondaCard({
  ronda,
  mostrarTenant = false,
  mostrarDono = false,
  agruparAmbientes = false,
  renderAmbiente,
}: RondaCardProps) {
  const [aberto, setAberto] = useState(false)
  const normais = ronda.ambientes.filter((a) => !a.temOcorrencia)
  const comOcorrencia = ronda.ambientes.filter((a) => a.temOcorrencia)
  const total = ronda.ambientes.length
  const totalOcs = comOcorrencia.reduce((acc, a) => acc + a.ocorrencias.length, 0)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-4 text-left"
        onClick={() => setAberto((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold font-sans text-dark text-sm">
              {format(new Date(ronda.iniciadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
            {mostrarTenant && ronda.tenant && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-indigo-100 text-indigo-700">
                {ronda.tenant.nome}
              </span>
            )}
            {comOcorrencia.length > 0 ? (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-orange-100 text-orange-700">
                {totalOcs} ocorrência{totalOcs !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-green-100 text-green-700">
                Tudo normal
              </span>
            )}
          </div>
          <span className="text-xs text-gray-300 font-sans">
            {total} ambiente{total !== 1 ? 's' : ''}{agruparAmbientes ? ' inspecionado' : ' verificado'}{total !== 1 ? 's' : ''}
            {ronda.finalizadoEm && (
              <> · {Math.round((new Date(ronda.finalizadoEm).getTime() - new Date(ronda.iniciadoEm).getTime()) / 60000)} min</>
            )}
            {mostrarDono && ronda.criadoPor && ` · por ${ronda.criadoPor.nome}`}
          </span>
        </div>
        {aberto ? <ChevronUp className="w-4 h-4 text-gray-300 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-300 shrink-0" />}
      </button>

      {aberto && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
          {agruparAmbientes ? (
            <>
              <GrupoAmbientes titulo="Ocorrências" ambientes={comOcorrencia} variante="ocorrencia" />
              <GrupoAmbientes titulo="Conformidade" ambientes={normais} variante="normal" />
              {total === 0 && (
                <p className="text-xs text-gray-300 font-sans text-center py-2">Nenhum ambiente registrado.</p>
              )}
            </>
          ) : (
            ronda.ambientes.map((amb) =>
              renderAmbiente ? renderAmbiente(amb.id) : null
            )
          )}
        </div>
      )}
    </div>
  )
}
