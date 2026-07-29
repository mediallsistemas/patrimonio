'use client'

import { useState } from 'react'
import { Camera, ChevronDown, ChevronUp } from 'lucide-react'

import { useFotosChamado } from '@/hooks/useChamados'
import FotoLightbox, { type FotoAmpliavel } from '@/components/ui/FotoLightbox'

// Carrega as fotos do chamado (abertura/execução) apenas quando solicitado —
// mesmo padrão do FotoLazy da ronda (listas nunca trafegam base64).
//
// A miniatura fica pequena de propósito, para não empurrar o resto do card para
// baixo; clicar abre a foto ampliada em modal, que é onde dá para enxergar algo.
export function FotoLazyChamado({ chamadoId }: { chamadoId: string }) {
  const [mostrar, setMostrar] = useState(false)
  const [ampliada, setAmpliada] = useState<number | null>(null)

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

  // Montado na ordem em que aparecem, para as setas do modal seguirem a tela.
  const fotos: FotoAmpliavel[] = [
    ...(data?.fotoAbertura ? [{ src: data.fotoAbertura, legenda: 'Abertura' }] : []),
    ...(data?.fotoExecucao ? [{ src: data.fotoExecucao, legenda: 'Execução' }] : []),
  ]

  const semFotos = !isLoading && fotos.length === 0

  return (
    <div className="mt-2 space-y-2">
      {toggleBtn}
      {isLoading && <span className="block text-xs text-gray-300 font-sans">Carregando...</span>}
      {semFotos && <span className="block text-xs text-gray-300 font-sans">Sem fotos registradas</span>}

      <div className="flex flex-wrap gap-3">
        {fotos.map((foto, i) => (
          <figure key={foto.legenda}>
            <button
              type="button"
              onClick={() => setAmpliada(i)}
              aria-label={`Ampliar foto de ${foto.legenda.toLowerCase()}`}
              className="block rounded-xl border border-gray-200 overflow-hidden cursor-zoom-in hover:border-indigo-300 transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.src} alt={`Foto de ${foto.legenda.toLowerCase()}`} className="max-h-48 block" />
            </button>
            <figcaption className="text-xs text-gray-400 font-sans mt-1">{foto.legenda}</figcaption>
          </figure>
        ))}
      </div>

      <FotoLightbox
        fotos={fotos}
        indice={ampliada}
        onFechar={() => setAmpliada(null)}
        onNavegar={setAmpliada}
      />
    </div>
  )
}
