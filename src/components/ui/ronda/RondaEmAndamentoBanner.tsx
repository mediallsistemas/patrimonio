import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Radio, User } from 'lucide-react'
import type { Ronda } from '@/services/rondas.types'

export function RondaEmAndamentoBanner({
  ronda,
  totalAmbientes,
}: {
  ronda: Ronda
  totalAmbientes?: number
}) {
  const verificados = ronda.ambientes.length
  const comOcorrencia = ronda.ambientes.filter((a) => a.temOcorrencia).length
  const progresso =
    totalAmbientes && totalAmbientes > 0
      ? Math.min(100, Math.round((verificados / totalAmbientes) * 100))
      : 0

  return (
    <div className="bg-white rounded-xl ring-1 ring-blue-100 shadow-sm overflow-hidden">
      {/* Barra de progresso no topo */}
      <div className="h-0.5 bg-blue-50">
        <div
          className="h-full bg-blue-400 transition-all duration-700"
          style={{ width: `${progresso}%` }}
        />
      </div>

      <div className="px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Ícone ao vivo */}
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Radio className="w-4 h-4 text-blue-500" />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">
                {ronda.tenant?.nome ?? '—'}
              </span>
              <span className="text-[11px] font-semibold text-blue-500 uppercase tracking-wide">
                ao vivo
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400">
                Iniciada às {format(new Date(ronda.iniciadoEm), 'HH:mm', { locale: ptBR })}
              </span>
              {ronda.criadoPor && (
                <>
                  <span className="text-gray-200">·</span>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <User className="w-3 h-3" />
                    {ronda.criadoPor.nome}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="flex items-center gap-5 shrink-0">
          <div className="text-right">
            <p className="text-lg font-bold text-gray-800 tabular-nums">{verificados}</p>
            <p className="text-[11px] text-gray-400">verificados</p>
          </div>
          {comOcorrencia > 0 && (
            <div className="text-right">
              <p className="text-lg font-bold text-orange-500 tabular-nums">{comOcorrencia}</p>
              <p className="text-[11px] text-gray-400">ocorrências</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
