'use client'

import { useState, useEffect, useCallback } from 'react'
import type { JWTPayload } from '@/modules/auth/auth.types'

type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: JWTPayload }
  | { status: 'unauthenticated' }

export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (!res.ok) {
        setState({ status: 'unauthenticated' })
        return
      }
      const json = await res.json() as { usuario: JWTPayload }
      setState({ status: 'authenticated', user: json.usuario })
    } catch {
      setState({ status: 'unauthenticated' })
    }
  }, [])

  useEffect(() => {
    void fetchMe()
  }, [fetchMe])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'DELETE', credentials: 'include' })
    setState({ status: 'unauthenticated' })
    window.location.href = '/login'
  }, [])

  const isLoading = state.status === 'loading'
  const user = state.status === 'authenticated' ? state.user : null
  const isSuperAdmin = user?.role === 'super_admin'
  const isViewer = (user?.role as string) === 'viewer'

  return { state, user, isLoading, isSuperAdmin, isViewer, logout, refresh: fetchMe }
}
