'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as rondasService from '@/services/rondas.service'

export function FotoLazy({ ocorrenciaId }: { ocorrenciaId: string }) {
  const [mostrar, setMostrar] = useState(false)
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
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={data.foto} alt="Ocorrência" className="mt-2 rounded-xl w-full max-h-64 object-cover border border-gray-200" />
}
