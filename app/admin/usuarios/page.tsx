'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Users, ArrowLeft, Plus } from 'lucide-react'
import Text from '@/components/ui/Text'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ModalCriarUsuario from '@/components/ui/modal/ModalCriarUsuario'
import { useAuth } from '@/hooks/useAuth'
import { useUsuarios } from '@/hooks/useAdminUsuarios'

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  manutencao_admin: 'Admin Manutenção',
  manutencao_user: 'Usuário Manutenção',
  tenant_admin: 'Admin Unidade',
  viewer: 'Visualizador',
}

const ROLE_COLOR: Record<string, string> = {
  super_admin: 'bg-purple-50 text-purple-700',
  manutencao_admin: 'bg-blue-50 text-blue-700',
  manutencao_user: 'bg-sky-50 text-sky-700',
  tenant_admin: 'bg-indigo-50 text-indigo-700',
  viewer: 'bg-gray-100 text-gray-500',
}

export default function UsuariosPage() {
  const [modal, setModal] = useState<{ open: boolean; defaultRole?: 'operator' | 'tenant_admin' }>({ open: false })
  const { user, isLoading: authLoading } = useAuth()
  const { usuarios, loading, reload } = useUsuarios()
  const isTenantAdmin = user?.role === 'tenant_admin'
  const fixedTenantId = isTenantAdmin && user?.tenantId ? user.tenantId : undefined

  return (
    <div className="form-bg min-h-screen flex flex-col items-center p-6">
      <div className="w-full max-w-3xl">

        <div className="flex items-center mb-8">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-dark font-sans transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Painel Admin
          </Link>
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
            {usuarios.map((u) => (
              <Card key={u.id} shadow="sm">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-blue-dark flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold font-sans text-dark block truncate">{u.nome}</span>
                    <span className="text-xs text-gray-300 font-sans block">{u.email}</span>
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
            {usuarios.length === 0 && (
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
