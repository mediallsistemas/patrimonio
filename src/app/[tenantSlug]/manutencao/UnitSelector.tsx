'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2 } from 'lucide-react'
import * as adminTenantsService from '@/services/admin-tenants.service'
import type { Tenant } from '@/services/admin-tenants.service'

/**
 * Seletor de unidade para admin_multi. Lista as unidades que o usuário administra
 * (/me/tenants) e, ao escolher, navega para /{slug}/manutencao. O slug da URL é a
 * fonte da verdade da unidade ativa — o ActiveTenantSync do layout reflete a
 * escolha no header x-tenant-id das chamadas /me/*.
 */
export default function UnitSelector({ currentSlug }: { currentSlug: string }) {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])

  useEffect(() => {
    let ativo = true
    adminTenantsService
      .listarMeusTenants()
      .then((data) => { if (ativo) setTenants(data) })
      .catch(() => { /* silencioso — sem unidades extras, esconde o seletor */ })
    return () => { ativo = false }
  }, [])

  if (tenants.length <= 1) return null

  return (
    <label className="flex items-center gap-1.5 text-sm font-sans">
      <Building2 className="w-4 h-4 text-gray-400" />
      <select
        value={currentSlug}
        onChange={(e) => {
          const slug = e.target.value
          if (slug && slug !== currentSlug) router.push(`/${slug}/manutencao`)
        }}
        className="border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-dark focus:outline-none focus:ring-2 focus:ring-blue-dark"
        aria-label="Trocar de unidade"
      >
        {tenants.map((t) => (
          <option key={t.id} value={t.slug}>{t.nome}</option>
        ))}
      </select>
    </label>
  )
}
