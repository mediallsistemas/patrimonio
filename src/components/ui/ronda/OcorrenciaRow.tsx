'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Camera, Phone, MapPin, Tag, ChevronDown, ChevronUp } from 'lucide-react'
import { TIPO_OCORRENCIA } from '@/lib/ronda-tipos'
import type { OcorrenciaFlat } from '@/lib/rondas-admin-utils'

const TIPO_CONFIG: Record<string, {
  border: string
  badge: string
  dot: string
}> = {
  eletrica: {
    border: 'border-l-amber-400',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    dot: 'bg-amber-400',
  },
  hidraulica: {
    border: 'border-l-blue-400',
    badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    dot: 'bg-blue-400',
  },
  patrimonio: {
    border: 'border-l-violet-400',
    badge: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
    dot: 'bg-violet-400',
  },
}

const FALLBACK_CONFIG = {
  border: 'border-l-gray-300',
  badge: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200',
  dot: 'bg-gray-300',
}

export function OcorrenciaRow({ oc }: { oc: OcorrenciaFlat }) {
  const [fotoAberta, setFotoAberta] = useState(false)
  const tipoBase = TIPO_OCORRENCIA[oc.tipo]
  const config = TIPO_CONFIG[oc.tipo] ?? FALLBACK_CONFIG

  return (
    <div className={`group border-l-[3px] ${config.border} bg-white rounded-r-xl shadow-sm hover:shadow-md transition-shadow duration-200`}>
      <div className="px-5 py-4 space-y-3">

        {/* Linha 1 — tipo + setor + horário */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${config.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
              {tipoBase?.label ?? oc.tipo}
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-sm font-semibold text-gray-800 truncate">
                {oc.ambienteNome}
              </span>
            </div>
            {oc.trilogoChamado && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                <Phone className="w-3 h-3" />
                Trilogo chamado
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400 tabular-nums shrink-0 pt-0.5">
            {format(new Date(oc.ambienteConcluidoEm), 'HH:mm', { locale: ptBR })}
          </span>
        </div>

        {/* Linha 2 — descrição */}
        {oc.descricao && (
          <p className="text-sm text-gray-600 leading-relaxed pl-0.5">{oc.descricao}</p>
        )}

        {/* Linha 3 — patrimônio */}
        {(oc.bemPatrimony || oc.bemDescricao) && (
          <div className="flex items-center gap-1.5 pl-0.5">
            <Tag className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-500">
              {oc.bemPatrimony && (
                <span className="font-semibold text-gray-700">Pat. {oc.bemPatrimony}</span>
              )}
              {oc.bemPatrimony && oc.bemDescricao && ' · '}
              {oc.bemDescricao}
            </span>
          </div>
        )}

        {/* Linha 4 — foto */}
        {oc.foto && (
          <div className="pl-0.5">
            <button
              onClick={() => setFotoAberta((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              {fotoAberta ? 'Ocultar foto' : 'Ver foto'}
              {fotoAberta
                ? <ChevronUp className="w-3 h-3" />
                : <ChevronDown className="w-3 h-3" />}
            </button>
            {fotoAberta && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={oc.foto}
                alt="Foto da ocorrência"
                className="mt-2.5 rounded-lg w-full max-h-72 object-cover ring-1 ring-gray-200"
              />
            )}
          </div>
        )}

        {/* Linha 5 — contexto (metadado discreto) */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-gray-50">
          <span className="text-[11px] text-gray-400 font-medium">{oc.tenantNome}</span>
          <span className="text-gray-200 text-xs">·</span>
          <span className="text-[11px] text-gray-400">
            Ronda {format(new Date(oc.rondaIniciadoEm), "dd/MM 'às' HH:mm", { locale: ptBR })}
          </span>
          {oc.criadoPorNome && (
            <>
              <span className="text-gray-200 text-xs">·</span>
              <span className="text-[11px] text-gray-400">{oc.criadoPorNome}</span>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
