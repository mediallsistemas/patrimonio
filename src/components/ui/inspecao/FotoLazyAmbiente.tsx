'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

export function FotoLazyAmbiente({ ambienteId }: { ambienteId: string }) {
  const [mostrar, setMostrar] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['foto-ambiente', ambienteId],
    queryFn: () => fetch(`/api/ambientes/${ambienteId}/foto`).then((r) => r.json()),
    enabled: mostrar,
  })

  if (!mostrar) {
    return (
      <button
        onClick={() => setMostrar(true)}
        className="text-xs text-red-base font-sans underline hover:text-red-dark"
      >
        Ver foto
      </button>
    )
  }
  if (isLoading) return <span className="text-xs text-gray-300 font-sans">Carregando foto...</span>
  if (!data?.foto) return <span className="text-xs text-gray-300 font-sans">Sem foto</span>
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={data.foto} alt="Ocorrência" className="mt-2 rounded-xl w-full max-h-64 object-cover border border-gray-200" />
}
