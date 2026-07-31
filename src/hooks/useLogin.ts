'use client'

import { useState, useCallback } from 'react'
import { login } from '@/services/auth.service'

interface UseLoginResult {
  isPending: boolean
  error: string
  submit: (email: string, senha: string, from?: string) => Promise<void>
}

export function useLogin(): UseLoginResult {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')

  const submit = useCallback(async (email: string, senha: string, from = '/') => {
    setError('')
    setIsPending(true)
    try {
      const { usuario } = await login({ email, senha })

      if (usuario.mustChangePassword) {
        window.location.href = '/mudar-senha'
        return
      }

      const isAdmin = usuario.role === 'super_admin' || usuario.role === 'tenant_admin' ||
        usuario.role === 'admin_multi' || usuario.role === 'viewer'
      const defaultDest = isAdmin
        ? '/admin'
        : usuario.tenantSlug
          ? `/${usuario.tenantSlug}/manutencao`
          : null

      // Don't honor `from` if it would send a non-admin to an admin-only area
      const fromIsValid = from && from !== '/' && !from.startsWith('/login') &&
        (isAdmin || !from.startsWith('/admin'))

      const dest = fromIsValid ? from : (defaultDest ?? '/login')
      console.log('[useLogin] from:', from, '| dest:', dest)
      window.location.href = dest
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setIsPending(false)
    }
  }, [])

  return { isPending, error, submit }
}
