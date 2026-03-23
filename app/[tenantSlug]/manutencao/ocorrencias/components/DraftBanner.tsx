'use client'

import { ChevronRight, RotateCcw } from 'lucide-react'
import Card from '@/components/card'
import Button from '@/components/button'
import Text from '@/components/text'
import { BLOCOS_AMBIENTES } from '@/app/[tenantSlug]/manutencao/ocorrencias/types'
import type { RondaDraftEstado } from '@/lib/hooks/useRondaDraft'

interface DraftBannerProps {
  draft: RondaDraftEstado
  handleContinuarDraft: () => void
  handleCancelarDraft: () => Promise<void>
}

export default function DraftBanner({ draft, handleContinuarDraft, handleCancelarDraft }: DraftBannerProps) {
  return (
    <Card shadow="md">
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: '#f97316' }}
        >
          <RotateCcw className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <Text as="p" variant="body-sm" className="text-dark font-semibold block">
            Ronda em andamento
          </Text>
          <Text variant="caption" className="text-gray-300 block mb-3">
            Você saiu sem finalizar.{' '}
            Bloco {draft.blocoIdx + 1} · {BLOCOS_AMBIENTES[draft.blocoIdx]?.bloco}
            {' · '}
            {draft.concluidos.length} ambiente{draft.concluidos.length !== 1 ? 's' : ''} concluído
            {draft.concluidos.length !== 1 ? 's' : ''}
          </Text>
          <div className="flex gap-2">
            <Button onClick={handleContinuarDraft} className="flex-1">
              Continuar <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={handleCancelarDraft} className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
