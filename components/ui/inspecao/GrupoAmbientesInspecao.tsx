'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { AmbienteCard } from '@/components/ui/inspecao/AmbienteCard'
import type { AmbienteInspecionado } from '@/services/inspecao.types'

interface GrupoAmbientesProps {
  titulo: string
  ambientes: AmbienteInspecionado[]
  variante: 'normal' | 'ocorrencia'
}

const ESTILOS = {
  normal:    { header: 'bg-green-50 border-green-200 text-green-800', badge: 'bg-green-100 text-green-700',   border: 'border-green-200' },
  ocorrencia:{ header: 'bg-orange-50 border-orange-200 text-orange-800', badge: 'bg-orange-100 text-orange-700', border: 'border-orange-200' },
}

export function GrupoAmbientesInspecao({ titulo, ambientes, variante }: GrupoAmbientesProps) {
  const [aberto, setAberto] = useState(false)
  const e = ESTILOS[variante]

  if (ambientes.length === 0) return null

  return (
    <div className={`rounded-xl border ${e.border} overflow-hidden`}>
      <button
        className={`w-full flex items-center justify-between px-3 py-2.5 text-left ${e.header}`}
        onClick={() => setAberto((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold font-sans">{titulo}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold font-sans ${e.badge}`}>
            {ambientes.length}
          </span>
        </div>
        {aberto ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>

      {aberto && (
        <div className="px-3 pb-3 pt-2 space-y-2">
          {ambientes.map((amb) => (
            <AmbienteCard key={amb.id} amb={amb} />
          ))}
        </div>
      )}
    </div>
  )
}
