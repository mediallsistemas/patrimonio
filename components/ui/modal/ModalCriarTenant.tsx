'use client'

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Building2, ChevronRight, ChevronLeft } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'
import { useTrilogoEmpresas, useTrilogoProjetos, useCreateTenant } from '@/hooks/useAdminTenants'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

type Step = 'trilogo' | 'detalhes'

export default function ModalCriarTenant({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>('trilogo')
  const [trilogoCompanyId, setTrilogoCompanyId] = useState<number | null>(null)
  const [trilogoProjectName, setTrilogoProjectName] = useState('')
  const [form, setForm] = useState({ nome: '', slug: '' })
  const [slugManual, setSlugManual] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<'nome' | 'slug', string>>>({})

  const { empresas } = useTrilogoEmpresas(open)
  const { projetos, loading: loadingProjetos } = useTrilogoProjetos(trilogoCompanyId)
  const { submitting, error: serverError, criar } = useCreateTenant()

  function toSlug(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  function handleProjectSelect(projectName: string) {
    setTrilogoProjectName(projectName)
    if (projectName) {
      setForm({ nome: projectName, slug: toSlug(projectName) })
      setSlugManual(false)
      setErrors({})
    }
  }

  function handleNomeChange(value: string) {
    setForm((f) => ({ ...f, nome: value, slug: slugManual ? f.slug : toSlug(value) }))
    setErrors((e) => ({ ...e, nome: '' }))
  }

  function handleSlugChange(value: string) {
    setSlugManual(true)
    setForm((f) => ({ ...f, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))
    setErrors((e) => ({ ...e, slug: '' }))
  }

  function goToDetalhes() {
    setStep('detalhes')
    setErrors({})
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
    const ok = await criar({
      nome: form.nome.trim(),
      slug: form.slug,
      ...(trilogoCompanyId != null && { trilogoCompanyId }),
      ...(trilogoProjectName && { trilogoProjectName }),
    })
    if (ok) {
      onCreated()
      handleClose()
    }
  }

  function handleClose() {
    onClose()
    setStep('trilogo')
    setTrilogoCompanyId(null)
    setTrilogoProjectName('')
    setForm({ nome: '', slug: '' })
    setSlugManual(false)
    setErrors({})
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {step === 'detalhes' && (
              <button
                onClick={() => setStep('trilogo')}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-dark hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl bg-[#6366f1] flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <Text as="h2" variant="heading-sm" className="text-dark">Nova Unidade</Text>
              <Text variant="caption" className="text-gray-300">
                {step === 'trilogo' ? 'Passo 1 — Vincular ao Trilogo' : 'Passo 2 — Dados da unidade'}
              </Text>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1 — Trilogo */}
        {step === 'trilogo' && (
          <div className="px-6 py-5 space-y-4">
            <Text variant="body-sm" className="text-gray-400 block">
              Selecione o hospital no Trilogo para vincular automaticamente os bens. Você pode pular esta etapa se não quiser vínculo.
            </Text>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-400 font-sans">Estado / Empresa</label>
              <select
                value={trilogoCompanyId ?? ''}
                onChange={(e) => setTrilogoCompanyId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 font-sans text-dark text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1] transition-all"
              >
                <option value="">Selecione o estado...</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.nome}</option>
                ))}
              </select>
            </div>

            {trilogoCompanyId && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-400 font-sans">Hospital / Projeto</label>
                {loadingProjetos ? (
                  <p className="text-sm text-gray-300 font-sans px-1">Carregando projetos...</p>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {projetos.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleProjectSelect(p)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-sans text-left transition-all ${
                          trilogoProjectName === p
                            ? 'border-[#6366f1] bg-indigo-50 text-indigo-700 font-semibold'
                            : 'border-gray-200 text-dark hover:border-[#6366f1] hover:bg-indigo-50'
                        }`}
                      >
                        {p}
                        {trilogoProjectName === p && <ChevronRight className="w-4 h-4 shrink-0" />}
                      </button>
                    ))}
                    {projetos.length === 0 && (
                      <p className="text-sm text-gray-300 font-sans px-1">Nenhum projeto encontrado.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="button" variant="primary" size="sm" className="flex-1" onClick={goToDetalhes}>
                {trilogoProjectName ? 'Continuar' : 'Pular vínculo'}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 — Unit details */}
        {step === 'detalhes' && (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            {trilogoProjectName && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100">
                <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                <span className="text-xs font-sans text-indigo-700">
                  Vinculado ao Trilogo: <strong>{trilogoProjectName}</strong>
                </span>
              </div>
            )}

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
              <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={() => setStep('trilogo')}>
                Voltar
              </Button>
              <Button type="submit" variant="primary" size="sm" className="flex-1" disabled={submitting}>
                {submitting ? 'Criando...' : 'Criar Unidade'}
              </Button>
            </div>
          </form>
        )}

      </div>
    </div>,
    document.body,
  )
}
