'use client'

import { useState } from 'react'
import { Camera, ChevronDown, ChevronUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import * as rondasService from '@/services/rondas.service'
import FotoLightbox from '@/components/ui/FotoLightbox'

export function FotoLazy({ ocorrenciaId }: { ocorrenciaId: string }) {
  const [mostrar, setMostrar] = useState(false)
  const [lightbox, setLightbox] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['foto-ocorrencia', ocorrenciaId],
    queryFn: () => rondasService.buscarFotoOcorrencia(ocorrenciaId),
    enabled: mostrar,
  })

  const toggleBtn = (
    <button
      onClick={() => setMostrar((v) => !v)}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
    >
      <Camera className="w-3.5 h-3.5" />
      {mostrar ? 'Ocultar foto' : 'Ver foto'}
      {mostrar ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
    </button>
  )

  if (!mostrar) return toggleBtn

  if (isLoading)
    return (
      <div className="mt-2 space-y-1">
        {toggleBtn}
        <span className="block text-xs text-gray-300 font-sans">Carregando...</span>
      </div>
    )

  if (!data?.foto)
    return (
      <div className="mt-2 space-y-1">
        {toggleBtn}
        <span className="block text-xs text-gray-300 font-sans">Sem foto</span>
      </div>
    )

  return (
    <>
      <div className="mt-2">
        {toggleBtn}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data.foto}
          alt="Ocorrência"
          onClick={() => setLightbox(true)}
          className="mt-2 rounded-xl w-full max-h-64 object-cover border border-gray-200 cursor-zoom-in"
        />
      </div>

      <FotoLightbox
        fotos={[{ src: data.foto, legenda: 'Ocorrência' }]}
        indice={lightbox ? 0 : null}
        onFechar={() => setLightbox(false)}
      />
    </>
  )
}
