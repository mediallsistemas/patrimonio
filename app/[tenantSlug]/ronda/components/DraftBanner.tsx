import { AlertTriangle, Play, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import type { DraftEstado } from '../ronda.types'

interface Props {
  draft: DraftEstado
  onRetomar: () => void
  onDescartar: () => void
}

export default function DraftBanner({ draft, onRetomar, onDescartar }: Props) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold font-sans text-amber-800 text-sm">Ronda em andamento</p>
          <p className="text-xs font-sans text-amber-700 mt-0.5">
            Você tem uma ronda pausada com {draft.registros.length} ambiente{draft.registros.length !== 1 ? 's' : ''} registrado{draft.registros.length !== 1 ? 's' : ''}.
            {' '}Iniciada às {new Date(draft.iniciadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onRetomar} className="flex-1 text-sm py-2">
          <Play className="w-4 h-4" /> Continuar ronda
        </Button>
        <Button variant="outline" onClick={onDescartar} className="flex-1 text-sm py-2">
          <X className="w-4 h-4" /> Descartar
        </Button>
      </div>
    </div>
  )
}
