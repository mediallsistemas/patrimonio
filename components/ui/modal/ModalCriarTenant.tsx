'use client'

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Building2 } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export default function ModalCriarTenant({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState({ nome: '', slug: '' })
  const [slugManual, setSlugManual] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  function toSlug(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  function handleNomeChange(value: string) {
    setForm((f) => ({
      ...f,
      nome: value,
      slug: slugManual ? f.slug : toSlug(value),
    }))
    setErrors((e) => ({ ...e, nome: '' }))
  }

  function handleSlugChange(value: string) {
    setSlugManual(true)
    setForm((f) => ({ ...f, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))
    setErrors((e) => ({ ...e, slug: '' }))
  }

  function validate(): boolean {
    const e: typeof errors = {}
    if (!form.nome.trim() || form.nome.trim().length < 2) e.nome = 'Nome deve ter ao menos 2 caracteres'
    if (!form.slug || form.slug.length < 2) e.slug = 'Slug deve ter ao menos 2 caracteres'
    if (!/^[a-z0-9-]+$/.test(form.slug)) e.slug = 'Apenas letras minúsculas, números e hífens'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setServerError('')
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: form.nome.trim(), slug: form.slug }),
      })
      const json = await res.json()
      if (!res.ok) {
        setServerError(json.error ?? 'Erro ao criar unidade')
        return
      }
      onCreated()
      onClose()
      setForm({ nome: '', slug: '' })
      setSlugManual(false)
    } catch {
      setServerError('Erro de conexão')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#6366f1] flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <Text as="h2" variant="heading-sm" className="text-dark">Nova Unidade</Text>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Input
            label="Nome da unidade"
            placeholder="Ex: Hospital Regional de Gurupi"
            value={form.nome}
            onChange={(e) => handleNomeChange(e.target.value)}
            error={errors.nome}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-400 font-sans">
              Slug <span className="text-gray-300 font-normal">(identificador único)</span>
            </label>
            <input
              type="text"
              placeholder="ex: hrgm"
              value={form.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border font-mono text-dark text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-base transition-all placeholder:text-gray-300 placeholder:font-sans ${errors.slug ? 'border-red-base' : 'border-gray-200'}`}
            />
            {form.slug && !errors.slug && (
              <span className="text-xs text-gray-300 font-sans">Acesso em: /{form.slug}/manutencao</span>
            )}
            {errors.slug && <span className="text-xs text-red-base font-sans">{errors.slug}</span>}
          </div>

          {serverError && (
            <p className="text-sm text-red-base font-sans bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" className="flex-1" disabled={submitting}>
              {submitting ? 'Criando...' : 'Criar Unidade'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
