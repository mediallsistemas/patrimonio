'use client'

import { useState, useEffect, useCallback } from 'react'
import * as adminUsuariosService from '@/services/admin-usuarios.service'
import * as adminTenantsService from '@/services/admin-tenants.service'
import type { Usuario, CreateUsuarioInput } from '@/services/admin-usuarios.service'
import type { Tenant } from '@/services/admin-tenants.service'

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminUsuariosService.listarUsuarios()
      setUsuarios(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return { usuarios, loading, reload: load }
}

export function useTenants(enabled: boolean) {
  const [tenants, setTenants] = useState<Tenant[]>([])

  useEffect(() => {
    if (!enabled) return
    adminTenantsService.listarTenants().then(setTenants).catch(() => setTenants([]))
  }, [enabled])

  return { tenants }
}

export interface CreateUsuarioState {
  submitting: boolean
  error: string
  criar: (input: CreateUsuarioInput) => Promise<boolean>
}

export function useCreateUsuario(): CreateUsuarioState {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const criar = useCallback(async (input: CreateUsuarioInput): Promise<boolean> => {
    setSubmitting(true)
    setError('')
    try {
      await adminUsuariosService.criarUsuario(input)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário')
      return false
    } finally {
      setSubmitting(false)
    }
  }, [])

  return { submitting, error, criar }
}
