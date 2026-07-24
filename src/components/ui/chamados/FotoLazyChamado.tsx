'use client'

import { useState } from 'react'
import { Camera, ChevronDown, ChevronUp } from 'lucide-react'

import { useFotosChamado } from '@/hooks/useChamados'

// Carrega as fotos do chamado (abertura/execução) apenas quando solicitado —
// mesmo padrão do FotoLazy da ronda (listas nunca trafegam base64).
export function FotoLazyChamado({ chamadoId }: { chamadoId: string }) {
  const [mostrar, setMostrar] = useState(false)

  const { data, isLoading } = useFotosChamado(mostrar ? chamadoId : null)

  const toggleBtn = (
    <button
      onClick={() => setMostrar((v) => !v)}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
    >
      <Camera className="w-3.5 h-3.5" />
      {mostrar ? 'Ocultar fotos' : 'Ver fotos'}
      {mostrar ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
    </button>
  )

  if (!mostrar) return toggleBtn

  const semFotos = !isLoading && !data?.fotoAbertura && !data?.fotoExecucao

  return (
    <div className="mt-2 space-y-2">
      {toggleBtn}
      {isLoading && <span className="block text-xs text-gray-300 font-sans">Carregando...</span>}
      {semFotos && <span className="block text-xs text-gray-300 font-sans">Sem fotos registradas</span>}
      <div className="flex flex-wrap gap-3">
        {data?.fotoAbertura && (
          <figure>
            <img src={data.fotoAbertura} alt="Foto de abertura" className="max-h-48 rounded-xl border border-gray-200" />
            <figcaption className="text-xs text-gray-400 font-sans mt-1">Abertura</figcaption>
          </figure>
        )}
        {data?.fotoExecucao && (
          <figure>
            <img src={data.fotoExecucao} alt="Foto da execução" className="max-h-48 rounded-xl border border-gray-200" />
            <figcaption className="text-xs text-gray-400 font-sans mt-1">Execução</figcaption>
          </figure>
        )}
      </div>
    </div>
  )
}
