'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
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

  if (!mostrar)
    return (
      <button onClick={() => setMostrar(true)} className="text-xs text-red-base font-sans underline hover:text-red-dark">
        Ver foto
      </button>
    )
  if (isLoading) return <span className="text-xs text-gray-300 font-sans">Carregando...</span>
  if (!data?.foto) return <span className="text-xs text-gray-300 font-sans">Sem foto</span>

  return (
    <>
      <div className="mt-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data.foto}
          alt="Ocorrência"
          onClick={() => setLightbox(true)}
          className="rounded-xl max-h-48 object-contain border border-gray-200 cursor-zoom-in"
        />
        <button
          onClick={() => setMostrar(false)}
          className="mt-1 text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
        >
          Fechar foto
        </button>
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
