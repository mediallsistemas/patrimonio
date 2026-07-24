'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle, MapPin } from 'lucide-react'

import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'
import FotoCapture from '@/components/ui/FotoCapture'
import type { ChamadoResumo } from '@/services/chamados.service'

interface Props {
  chamado: ChamadoResumo | null // null = fechado
  loading?: boolean
  erro?: string | null
  onConfirmar: (input: {
    descricaoExecucao: string
    fotoExecucao: string | null
  }) => void
  onClose: () => void
}

// Finalização do chamado — mesmo formato do relato de ocorrência da ronda:
// o ambiente do chamado + o que foi feito + foto da execução.
export default function ModalFinalizarChamado({ chamado, loading, erro, onConfirmar, onClose }: Props) {
  const open = chamado !== null
  const [descricao, setDescricao] = useState('')
  const [foto, setFoto] = useState<string | null>(null)
  const [erroLocal, setErroLocal] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      setDescricao('')
      setFoto(null)
      setErroLocal(null)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open || !chamado) return null

  function handleConfirmar() {
    if (descricao.trim().length < 3) {
      setErroLocal('Descreva o que foi feito')
      return
    }
    setErroLocal(null)
    onConfirmar({
      descricaoExecucao: descricao.trim(),
      fotoExecucao: foto,
    })
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
            <div className="w-9 h-9 rounded-xl bg-green-base flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <Text as="h2" variant="heading-sm" className="text-dark block">Finalizar chamado</Text>
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
          {/* Ambiente do chamado */}
          <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
            <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block">
              Ambiente
            </Text>
            <span className="inline-flex items-center gap-1.5 text-sm font-sans text-dark">
              <MapPin className="w-3.5 h-3.5 text-gray-300" />
              {chamado.ambienteNomeSnapshot ?? '—'}
              {chamado.blocoNomeSnapshot ? ` · ${chamado.blocoNomeSnapshot}` : ''}
            </span>
          </div>

          <div>
            <Text variant="caption" className="text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
              O que foi feito *
            </Text>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o serviço executado"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-sans text-dark focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white placeholder:text-gray-300 resize-none"
            />
          </div>

          <FotoCapture
            label="Foto da execução"
            hint="Opcional — registre o resultado"
            valor={foto}
            onChange={setFoto}
            accent="green"
          />

          {(erroLocal || erro) && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600 font-sans">{erroLocal ?? erro}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
              Voltar
            </Button>
            <Button variant="success" className="flex-1" onClick={handleConfirmar} disabled={loading}>
              {loading ? 'Finalizando...' : 'Finalizar chamado'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
