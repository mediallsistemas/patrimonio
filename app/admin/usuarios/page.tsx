'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Users, ArrowLeft } from 'lucide-react'
import Text from '@/components/ui/Text'
import Card from '@/components/ui/Card'

interface Tenant { id: string; slug: string; nome: string }
interface Usuario {
  id: string
  email: string
  nome: string
  role: string
  ativo: boolean
  criadoEm: string
  tenantId: string | null
  sistemas: string[]
  tenant: Tenant | null
}

const ROLE_LABEL: Record<string, string> = {
  super_admin:        'Super Admin',
  manutencao_admin:   'Admin Manutenção',
  manutencao_user:    'Usuário Manutenção',
  tenant_admin:       'Admin Unidade',
  operator:           'Operador',
  operator_patrimonio:'Op. Patrimônio',
  operator_forms:     'Op. Formulários',
  viewer:             'Visualizador',
}

const ROLE_COLOR: Record<string, string> = {
  super_admin:        'bg-purple-50 text-purple-700',
  manutencao_admin:   'bg-blue-50 text-blue-700',
  manutencao_user:    'bg-sky-50 text-sky-700',
  tenant_admin:       'bg-indigo-50 text-indigo-700',
  operator:           'bg-orange-50 text-orange-700',
  operator_patrimonio:'bg-amber-50 text-amber-700',
  operator_forms:     'bg-teal-50 text-teal-700',
  viewer:             'bg-gray-100 text-gray-500',
}

const ADMIN_ROLES = new Set(['super_admin', 'manutencao_admin', 'tenant_admin'])

function toUsername(email: string): string {
  return email.replace(/@sistema\.local$/, '').replace(/@noreply\.local$/, '')
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios]     = useState<Usuario[]>([])
  const [tenants, setTenants]       = useState<Tenant[]>([])
  const [loading, setLoading]       = useState(true)
  const [filterTenant, setFilterTenant] = useState<string>('')
  const [filterType, setFilterType] = useState<'all' | 'admin' | 'operator'>('all')
  const [filterAtivo, setFilterAtivo] = useState<'all' | 'ativo' | 'inativo'>('all')

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/usuarios').then((r) => r.json()),
      fetch('/api/admin/tenants').then((r) => r.json()),
    ]).then(([u, t]) => {
      setUsuarios(u.data ?? u)
      setTenants(t.data ?? t)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    return usuarios.filter((u) => {
      if (filterTenant && u.tenantId !== filterTenant) return false
      if (filterType === 'admin' && !ADMIN_ROLES.has(u.role)) return false
      if (filterType === 'operator' && ADMIN_ROLES.has(u.role)) return false
      if (filterAtivo === 'ativo' && !u.ativo) return false
      if (filterAtivo === 'inativo' && u.ativo) return false
      if (!u.sistemas.includes('linensistem')) return false
      return true
    })
  }, [usuarios, filterTenant, filterType, filterAtivo])

  return (
    <div className="form-bg min-h-screen flex flex-col items-center p-6">
      <div className="w-full max-w-3xl">

        <div className="flex items-center mb-8">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-dark font-sans transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Painel Admin
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-dark flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <Text as="h1" variant="heading-sm" className="text-dark block">
              Usuários
              {!loading && (
                <span className="text-sm font-normal text-gray-300 ml-2">
                  {filtered.length}/{usuarios.length}
                </span>
              )}
            </Text>
            <Text variant="body-sm" className="text-gray-300 block">Contas de acesso ao sistema</Text>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-5">
          {tenants.length > 0 && (
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

          <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
            {(['all', 'ativo', 'inativo'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterAtivo(s)}
                className={`text-xs font-sans px-3 py-1 rounded-md transition-colors ${
                  filterAtivo === s ? 'bg-blue-dark text-white' : 'text-gray-300 hover:text-dark'
                }`}
              >
                {s === 'all' ? 'Todos' : s === 'ativo' ? 'Ativos' : 'Inativos'}
              </button>
            ))}
          </div>

        </div>

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
