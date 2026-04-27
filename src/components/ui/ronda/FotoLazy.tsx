'use client'

import { useState } from 'react'
import { Camera, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import * as rondasService from '@/services/rondas.service'

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

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.foto}
            alt="Ocorrência"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-xl"
          />
        </div>
      )}
    </>
  )
}
