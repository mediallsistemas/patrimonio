'use client'

import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, KeyRound } from 'lucide-react'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'

interface Props {
  open: boolean
  nome: string
  onConfirm: () => void
  onClose: () => void
  loading?: boolean
}

export default function ModalConfirmarReset({ open, nome, onConfirm, onClose, loading }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-base flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-white" />
            </div>
            <Text as="h2" variant="heading-sm" className="text-dark">Redefinir Senha</Text>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <Text variant="body-sm" className="text-gray-400 block">
            A senha de <span className="font-semibold text-dark">{nome}</span> será redefinida para{' '}
            <span className="font-mono font-semibold text-dark">12345678</span>.
          </Text>
          <Text variant="body-sm" className="text-gray-400 block">
            O usuário será obrigado a criar uma nova senha no próximo login.
          </Text>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="button" variant="primary" size="sm" className="flex-1" onClick={onConfirm} disabled={loading}>
              {loading ? 'Redefinindo...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
