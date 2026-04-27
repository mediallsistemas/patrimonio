'use client'

import { useState, useEffect, useCallback } from 'react'
import * as adminTenantsService from '@/services/admin-tenants.service'
import * as trilogoService from '@/services/trilogo.service'
import type { Tenant, CreateTenantInput } from '@/services/admin-tenants.service'
import type { Empresa } from '@/services/trilogo.service'

export function useTenantsList() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminTenantsService.listarTenants()
      setTenants(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return { tenants, loading, reload: load }
}

export interface CreateTenantState {
  submitting: boolean
  error: string
  criar: (input: CreateTenantInput) => Promise<boolean>
}

export function useCreateTenant(): CreateTenantState {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const criar = useCallback(async (input: CreateTenantInput): Promise<boolean> => {
    setSubmitting(true)
    setError('')
    try {
      await adminTenantsService.criarTenant(input)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar unidade')
      return false
    } finally {
      setSubmitting(false)
    }
  }, [])

  return { submitting, error, criar }
}

export function useTrilogoEmpresas(enabled: boolean) {
  const [empresas, setEmpresas] = useState<Empresa[]>([])

  useEffect(() => {
    if (!enabled) return
    trilogoService.buscarEmpresas().then(setEmpresas).catch(() => setEmpresas([]))
  }, [enabled])

  return { empresas }
}

export function useTrilogoProjetos(companyId: number | null) {
  const [projetos, setProjetos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!companyId) { setProjetos([]); return }
    setLoading(true)
    trilogoService.buscarProjetos(companyId)
      .then(setProjetos)
      .catch(() => setProjetos([]))
      .finally(() => setLoading(false))
  }, [companyId])

  return { projetos, loading }
}
