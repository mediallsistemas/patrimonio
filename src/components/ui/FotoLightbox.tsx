'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

// Visualização ampliada de foto, em modal.
//
// Existe como componente porque a mesma coisa estava reescrita à mão em rondas,
// manutenções e chamados — cada cópia com um comportamento a menos. Esta fecha
// no Escape, trava a rolagem do fundo e vai por portal, para não ficar presa
// dentro de um card com `overflow: hidden`.

export interface FotoAmpliavel {
  src: string
  legenda: string
}

interface Props {
  fotos: FotoAmpliavel[]
  /** Índice da foto aberta. `null` fecha. */
  indice: number | null
  onFechar: () => void
  onNavegar?: (indice: number) => void
}

export default function FotoLightbox({ fotos, indice, onFechar, onNavegar }: Props) {
  const [montado, setMontado] = useState(false)
  useEffect(() => setMontado(true), [])

  const aberto = indice !== null && indice >= 0 && indice < fotos.length
  const varias = fotos.length > 1

  useEffect(() => {
    if (!aberto) return

    // Rolagem do fundo travada enquanto a foto está aberta — sem isto, rolar
    // sobre o overlay move a página atrás dele.
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onTecla(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
      if (!varias || !onNavegar || indice === null) return
      if (e.key === 'ArrowRight') onNavegar((indice + 1) % fotos.length)
      if (e.key === 'ArrowLeft') onNavegar((indice - 1 + fotos.length) % fotos.length)
    }

    window.addEventListener('keydown', onTecla)
    return () => {
      window.removeEventListener('keydown', onTecla)
      document.body.style.overflow = anterior
    }
  }, [aberto, indice, fotos.length, varias, onNavegar, onFechar])

  if (!montado || !aberto || indice === null) return null

  const foto = fotos[indice]

  function irPara(delta: number) {
    if (!onNavegar || indice === null) return
    onNavegar((indice + delta + fotos.length) % fotos.length)
  }

  // z-80 fica acima dos modais do projeto (z-60): a foto ampliada é sempre o que
  // está por cima, inclusive quando aberta de dentro de um modal.
  return createPortal(
    <div
      className="fixed inset-0 z-[80] bg-black/85 flex flex-col items-center justify-center p-4"
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
      aria-label={foto.legenda}
    >
      <button
        onClick={onFechar}
        aria-label="Fechar"
        className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
      >
        <X size={20} />
      </button>

      {varias && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); irPara(-1) }}
            aria-label="Foto anterior"
            className="absolute left-4 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); irPara(1) }}
            aria-label="Próxima foto"
            className="absolute right-4 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={foto.src}
        alt={foto.legenda}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[85vh] object-contain rounded-xl"
      />

      <div className="mt-3 text-center" onClick={(e) => e.stopPropagation()}>
        <p className="text-white text-sm font-medium font-sans">{foto.legenda}</p>
        {varias && (
          <p className="text-white/60 text-xs font-sans mt-0.5">
            {indice + 1} de {fotos.length}
          </p>
        )}
      </div>
    </div>,
    document.body,
  )
}
