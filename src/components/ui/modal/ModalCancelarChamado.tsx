'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Ban } from 'lucide-react'

import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'
import type { ChamadoResumo } from '@/services/chamados.service'

interface Props {
  chamado: ChamadoResumo | null // null = fechado
  loading?: boolean
  erro?: string | null
  onConfirmar: (motivo?: string) => void
  onClose: () => void
}

// Cancelamento do chamado — motivo é OPCIONAL, sem validação de preenchimento
// (ao contrário de finalizar, onde descrever o que foi feito é obrigatório).
export default function ModalCancelarChamado({ chamado, loading, erro, onConfirmar, onClose }: Props) {
  const open = chamado !== null
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      setMotivo('')
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open || !chamado) return null

  function handleConfirmar() {
    onConfirmar(motivo.trim() || undefined)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-500 flex items-center justify-center">
              <Ban className="w-4 h-4 text-white" />
            </div>
            <div>
              <Text as="h2" variant="heading-sm" className="text-dark block">Cancelar chamado</Text>
              <Text variant="caption" className="text-gray-300 block">#{chamado.numero} · {chamado.titulo}</Text>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-sm text-amber-700 font-sans">Esta ação não pode ser desfeita.</p>
          </div>

          <div>
            <Text variant="caption" className="text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
              Motivo do cancelamento (opcional)
            </Text>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Por que este chamado está sendo cancelado?"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-sans text-dark focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white placeholder:text-gray-300 resize-none"
            />
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600 font-sans">{erro}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
              Voltar
            </Button>
            <Button variant="secondary" className="flex-1" onClick={handleConfirmar} disabled={loading}>
              {loading ? 'Cancelando...' : 'Cancelar chamado'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
