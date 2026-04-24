'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, UserPlus } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'
import { useTenants, useCreateUsuario } from '@/hooks/useAdminUsuarios'

interface Props {
  open: boolean
  defaultRole?: 'tenant_admin' | 'operator'
  fixedTenantId?: string
  showUnitSelector?: boolean
  onClose: () => void
  onCreated: () => void
}

const ROLE_OPTIONS = [
  { value: 'operator', label: 'Operador' },
  { value: 'tenant_admin', label: 'Admin da Unidade' },
]

export default function ModalCriarUsuario({ open, defaultRole, fixedTenantId, showUnitSelector = true, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    nome: '',
    username: '',
    senha: '',
    role: defaultRole ?? 'operator',
    tenantId: fixedTenantId ?? '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({})

const { tenants } = useTenants(open && !fixedTenantId)
  const { submitting, error: serverError, criar } = useCreateUsuario()

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      setForm({ nome: '', username: '', senha: '', role: defaultRole ?? 'operator', tenantId: fixedTenantId ?? '' })
      setErrors({})
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open, defaultRole, fixedTenantId])

  function validate(): boolean {
    const e: typeof errors = {}
    if (!form.nome.trim() || form.nome.trim().length < 2) e.nome = 'Nome deve ter ao menos 2 caracteres'
    if (!form.username.trim() || form.username.trim().length < 3) e.username = 'Usuário deve ter ao menos 3 caracteres'
    if (!/^[a-z0-9._-]+$/.test(form.username)) e.username = 'Apenas letras minúsculas, números, ponto, hífen e underscore'
    if (!form.senha || form.senha.length < 8) e.senha = 'Senha deve ter ao menos 8 caracteres'
    if (showUnitSelector && !form.tenantId) e.tenantId = 'Selecione uma unidade'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const ok = await criar({
      nome: form.nome.trim(),
      username: form.username.trim().toLowerCase(),
      senha: form.senha,
      role: form.role,
      ...(form.tenantId ? { tenantId: form.tenantId } : {}),
    })
    if (ok) {
      onCreated()
      onClose()
    }
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target !== e.currentTarget) e.currentTarget.dataset.innerClick = '1' }}
      onClick={(e) => {
        if (e.currentTarget.dataset.innerClick === '1') { delete e.currentTarget.dataset.innerClick; return }
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-dark flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            <Text as="h2" variant="heading-sm" className="text-dark">Criar Usuário</Text>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Input
            label="Nome"
            placeholder="Nome completo"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            error={errors.nome}
          />

          <Input
            label="Nome de usuário"
            type="text"
            placeholder="ex: equipe.hrgm"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))}
            error={errors.username}
          />

          <Input
            label="Senha"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={form.senha}
            onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
            error={errors.senha}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-400 font-sans">Perfil</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as typeof form.role, tenantId: '' }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white font-sans text-dark text-sm focus:outline-none focus:ring-2 focus:ring-red-base focus:ring-offset-0 transition-all"
            >
              {ROLE_OPTIONS.filter((o) => !fixedTenantId || o.value !== 'super_admin').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {showUnitSelector && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-400 font-sans">Unidade</label>
              <select
                value={form.tenantId}
                onChange={(e) => setForm((f) => ({ ...f, tenantId: e.target.value }))}
                className={`w-full px-4 py-3 rounded-xl border bg-white font-sans text-dark text-sm focus:outline-none focus:ring-2 focus:ring-red-base focus:ring-offset-0 transition-all ${errors.tenantId ? 'border-red-base' : 'border-gray-200'}`}
              >
                <option value="">Selecionar unidade...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
              {errors.tenantId && <span className="text-xs text-red-base font-sans">{errors.tenantId}</span>}
            </div>
          )}

          {serverError && (
            <p className="text-sm text-red-base font-sans bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" className="flex-1" disabled={submitting}>
              {submitting ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
