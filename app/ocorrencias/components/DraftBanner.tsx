'use client'

import { AlertTriangle, Play, X } from 'lucide-react'
import Button from '@/components/button'
import type { DraftEstado } from '@/app/ocorrencias/types'

interface DraftBannerProps {
  draftServidor: DraftEstado
  retomar: () => void
  descartarDraft: () => void
}

export default function DraftBanner({ draftServidor, retomar, descartarDraft }: DraftBannerProps) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold font-sans text-amber-800 text-sm">Ronda em andamento</p>
          <p className="text-xs font-sans text-amber-700 mt-0.5">
            {draftServidor.concluidos.length} local
            {draftServidor.concluidos.length !== 1 ? 'is' : ''} registrado
            {draftServidor.concluidos.length !== 1 ? 's' : ''} · iniciada às{' '}
            {new Date(draftServidor.iniciadoEm).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={retomar} className="flex-1 text-sm py-2">
          <Play className="w-4 h-4" /> Continuar ronda
        </Button>
        <Button variant="outline" onClick={descartarDraft} className="flex-1 text-sm py-2">
          <X className="w-4 h-4" /> Descartar
        </Button>
      </div>
    </div>
  )
}
