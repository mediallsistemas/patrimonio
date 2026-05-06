'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Users, ArrowLeft } from 'lucide-react'
import Text from '@/components/ui/Text'
import Card from '@/components/ui/Card'
import { useAuth } from '@/hooks/useAuth'
import { useUsuarios, useTenants } from '@/hooks/useAdminUsuarios'

const ROLE_LABEL: Record<string, string> = {
  super_admin:         'Super Admin',
  tenant_admin:        'Admin Unidade',
  operator:            'Operador',
  operator_patrimonio: 'Op. Patrimônio',
  operator_forms:      'Op. Formulários',
  viewer:              'Visualizador',
}

const ROLE_COLOR: Record<string, string> = {
  super_admin:         'bg-purple-50 text-purple-700',
  tenant_admin:        'bg-indigo-50 text-indigo-700',
  operator:            'bg-orange-50 text-orange-700',
  operator_patrimonio: 'bg-amber-50 text-amber-700',
  operator_forms:      'bg-teal-50 text-teal-700',
  viewer:              'bg-gray-100 text-gray-500',
}

function toUsername(email: string): string {
  return email.replace(/@sistema\.local$/, '').replace(/@noreply\.local$/, '')
}

export default function ViewerUsuariosPage() {
  const [filterTenant, setFilterTenant] = useState<string>('')

  const { user } = useAuth()
  const { usuarios, loading } = useUsuarios()
  const { tenants } = useTenants(true)

  const filtered = useMemo(() => {
    return usuarios.filter((u) => {
      if (filterTenant && u.tenantId !== filterTenant) return false
      return true
    })
  }, [usuarios, filterTenant])

  return (
    <div className="form-bg min-h-screen flex flex-col items-center p-6">
      <div className="w-full max-w-3xl">

        <div className="flex items-center justify-between mb-8">
          <Link href="/viewer" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-dark font-sans transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Painel
          </Link>
          <span className="text-xs text-gray-300 font-sans">{user?.nome}</span>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-dark flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <Text as="h1" variant="heading-sm" className="text-dark block">Usuários</Text>
            <Text variant="body-sm" className="text-gray-300 block">Contas das unidades vinculadas</Text>
          </div>
        </div>

        {/* Filtro por tenant */}
        {tenants.length > 1 && (
          <div className="flex flex-wrap gap-3 mb-5">
            <select
              value={filterTenant}
              onChange={(e) => setFilterTenant(e.target.value)}
              className="text-sm font-sans border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-dark focus:outline-none focus:ring-2 focus:ring-blue-dark"
            >
              <option value="">Todas as unidades</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>
        )}

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
