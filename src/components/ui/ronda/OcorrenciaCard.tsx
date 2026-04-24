'use client'

import { useState } from 'react'
import { Camera, Phone } from 'lucide-react'
import { TIPO_OCORRENCIA } from '@/lib/ronda-tipos'
import type { OcorrenciaDetalhe } from '@/services/rondas.types'

export function OcorrenciaCard({ oc }: { oc: OcorrenciaDetalhe }) {
  const [fotoAberta, setFotoAberta] = useState(false)
  const tipo = TIPO_OCORRENCIA[oc.tipo]

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 space-y-2">
      {/* Cabeçalho: tipo + trilogo */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold font-sans ${tipo?.color ?? 'bg-gray-100 text-gray-500'}`}>
          {tipo?.label ?? oc.tipo}
        </span>
        {oc.trilogoChamado && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-indigo-100 text-indigo-700">
            <Phone className="w-3 h-3" />
            Trilogo chamado
          </span>
        )}
      </div>

      {/* Descrição */}
      {oc.descricao && (
        <p className="text-sm text-gray-700 font-sans leading-snug">{oc.descricao}</p>
      )}

      {/* Patrimônio */}
      {(oc.bemPatrimony || oc.bemDescricao) && (
        <div className="text-xs text-gray-500 font-sans space-y-0.5">
          {oc.bemPatrimony && <p><span className="font-semibold">Patrimônio:</span> {oc.bemPatrimony}</p>}
          {oc.bemDescricao && <p><span className="font-semibold">Bem:</span> {oc.bemDescricao}</p>}
        </div>
      )}

      {/* Foto */}
      {oc.foto && (
        <div>
          <button
            onClick={() => setFotoAberta((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-indigo-600 font-sans font-semibold hover:underline"
          >
            <Camera className="w-3.5 h-3.5" />
            {fotoAberta ? 'Ocultar foto' : 'Ver foto'}
          </button>
          {fotoAberta && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={oc.foto}
              alt="Foto da ocorrência"
              className="mt-2 rounded-lg w-full max-h-64 object-cover border border-orange-200"
            />
          )}
        </div>
      )}
    </div>
  )
}
