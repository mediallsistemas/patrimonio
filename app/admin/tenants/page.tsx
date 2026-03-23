'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, ArrowLeft } from 'lucide-react'
import Text from '@/components/text'
import Card from '@/components/card'

interface Tenant {
  id: string
  slug: string
  nome: string
  ativo: boolean
  criadoEm: string
  _count: { usuarios: number; pessoas: number }
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/tenants')
      .then((r) => r.json())
      .then((j) => { setTenants(j.data ?? j); setLoading(false) })
  }, [])

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
          <div className="w-10 h-10 rounded-xl bg-[#6366f1] flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <Text as="h1" variant="heading-sm" className="text-dark block">Unidades</Text>
            <Text variant="body-sm" className="text-gray-300 block">Hospitais e unidades cadastradas</Text>
          </div>
        </div>

        {loading ? (
          <Text variant="body-sm" className="text-gray-300 text-center block py-10">Carregando...</Text>
        ) : (
          <div className="space-y-3">
            {tenants.map((t) => (
              <Card key={t.id} shadow="sm">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-[#6366f1] flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold font-sans text-dark block truncate">{t.nome}</span>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-300 font-mono">/{t.slug}</span>
                      <span className="text-xs text-gray-300 font-sans">{t._count.usuarios} usuário(s)</span>
                      <span className="text-xs text-gray-300 font-sans">{t._count.pessoas} pessoa(s)</span>
                      <span className={`text-xs font-sans px-1.5 py-0.5 rounded ${t.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {t.ativo ? 'ativo' : 'inativo'}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            {tenants.length === 0 && (
              <Text variant="body-sm" className="text-gray-300 text-center block py-10">
                Nenhuma unidade encontrada
              </Text>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
