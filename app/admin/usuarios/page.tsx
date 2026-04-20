'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { Users, ArrowLeft, Plus } from 'lucide-react'
import Text from '@/components/ui/Text'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ModalCriarUsuario from '@/components/ui/modal/ModalCriarUsuario'
import { useAuth } from '@/hooks/useAuth'
import { useUsuarios, useTenants } from '@/hooks/useAdminUsuarios'

const ROLE_LABEL: Record<string, string> = {
  super_admin:         'Super Admin',
  manutencao_admin:    'Admin Manutenção',
  manutencao_user:     'Usuário Manutenção',
  tenant_admin:        'Admin Unidade',
  operator:            'Operador',
  operator_patrimonio: 'Op. Patrimônio',
  operator_forms:      'Op. Formulários',
  viewer:              'Visualizador',
}

const ROLE_COLOR: Record<string, string> = {
  super_admin:         'bg-purple-50 text-purple-700',
  manutencao_admin:    'bg-blue-50 text-blue-700',
  manutencao_user:     'bg-sky-50 text-sky-700',
  tenant_admin:        'bg-indigo-50 text-indigo-700',
  operator:            'bg-orange-50 text-orange-700',
  operator_patrimonio: 'bg-amber-50 text-amber-700',
  operator_forms:      'bg-teal-50 text-teal-700',
  viewer:              'bg-gray-100 text-gray-500',
}

const ADMIN_ROLES = new Set(['super_admin', 'manutencao_admin', 'tenant_admin'])

function toUsername(email: string): string {
  return email.replace(/@sistema\.local$/, '').replace(/@noreply\.local$/, '')
}

export default function UsuariosPage() {
  const [modal, setModal] = useState<{ open: boolean; defaultRole?: 'operator' | 'tenant_admin' }>({ open: false })
  const [filterTenant, setFilterTenant] = useState<string>('')
  const [filterType, setFilterType] = useState<'all' | 'admin' | 'operator'>('all')

  const { user, isLoading: authLoading } = useAuth()
  const { usuarios, loading, reload } = useUsuarios()
  const isTenantAdmin = user?.role === 'tenant_admin'
  const isSuperAdmin = user?.role === 'super_admin'
  const fixedTenantId = isTenantAdmin && user?.tenantId ? user.tenantId : undefined

  const { tenants } = useTenants(isSuperAdmin)

  const filtered = useMemo(() => {
    return usuarios.filter((u) => {
      if (filterTenant && u.tenantId !== filterTenant) return false
      if (filterType === 'admin' && !ADMIN_ROLES.has(u.role)) return false
      if (filterType === 'operator' && ADMIN_ROLES.has(u.role)) return false
      if (u.sistemas && !u.sistemas.includes('linensistem')) return false
      return true
    })
  }, [usuarios, filterTenant, filterType])

  const loggedUsername = user?.email ? toUsername(user.email) : null

  return (
    <div className="form-bg min-h-screen flex flex-col items-center p-6">
      <div className="w-full max-w-3xl">

        <div className="flex items-center justify-between mb-8">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-dark font-sans transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Painel Admin
          </Link>
          {loggedUsername && (
            <span className="text-xs text-gray-300 font-mono">{loggedUsername}</span>
          )}
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-dark flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <Text as="h1" variant="heading-sm" className="text-dark block">Usuários</Text>
              <Text variant="body-sm" className="text-gray-300 block">Contas de acesso ao sistema</Text>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModal({ open: true, defaultRole: isTenantAdmin ? 'operator' : 'tenant_admin' })}
            disabled={authLoading}
          >
            <Plus className="w-4 h-4" />
            Novo Usuário
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-5">
          {isSuperAdmin && tenants.length > 0 && (
            <select
              value={filterTenant}
              onChange={(e) => setFilterTenant(e.target.value)}
              className="text-sm font-sans border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-dark focus:outline-none focus:ring-2 focus:ring-blue-dark"
            >
              <option value="">Todos os projetos</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          )}
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
            {(['all', 'admin', 'operator'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`text-xs font-sans px-3 py-1 rounded-md transition-colors ${
                  filterType === type ? 'bg-blue-dark text-white' : 'text-gray-300 hover:text-dark'
                }`}
              >
                {type === 'all' ? 'Todos' : type === 'admin' ? 'Admin' : 'Operador'}
              </button>
            ))}
          </div>
        </div>

        <ModalCriarUsuario
          open={modal.open}
          defaultRole={modal.defaultRole}
          fixedTenantId={fixedTenantId}
          showUnitSelector={!isTenantAdmin}
          onClose={() => setModal({ open: false })}
          onCreated={reload}
        />

        {loading ? (
          <Text variant="body-sm" className="text-gray-300 text-center block py-10">Carregando...</Text>
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => (
              <Card key={u.id} shadow="sm">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-blue-dark flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold font-sans text-dark block truncate">{u.nome}</span>
                    <span className="text-xs text-gray-300 font-mono block">{toUsername(u.email)}</span>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs font-sans px-1.5 py-0.5 rounded ${ROLE_COLOR[u.role] ?? 'bg-gray-100 text-gray-500'}`}>
                        {ROLE_LABEL[u.role] ?? u.role}
                      </span>
                      {u.tenant && (
                        <span className="text-xs text-gray-300 font-mono">/{u.tenant.slug}</span>
                      )}
                      <span className={`text-xs font-sans px-1.5 py-0.5 rounded ${u.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {u.ativo ? 'ativo' : 'inativo'}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            {filtered.length === 0 && (
              <Text variant="body-sm" className="text-gray-300 text-center block py-10">
                Nenhum usuário encontrado
              </Text>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
