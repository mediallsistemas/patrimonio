import { ApiError } from '@/lib/error-message'
import { getActiveTenantId } from '@/services/active-tenant'

const API_BASE = '/api'

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const activeTenantId = getActiveTenantId()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Unidade ativa (admin_multi); o servidor valida o acesso e ignora p/ os demais.
    ...(activeTenantId ? { 'x-tenant-id': activeTenantId } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  }

  const response = await fetch(`${API_BASE}/${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (!response.ok) {
    const json = await response.json().catch(() => ({})) as Record<string, unknown>
    const message = String(json['error'] ?? json['message'] ?? `HTTP ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<T>
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
}
