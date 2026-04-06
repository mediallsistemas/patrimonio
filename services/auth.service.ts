import { api } from '@/services/api'

export async function logout(): Promise<void> {
  await api.delete<void>('auth/logout')
}

export interface LoginInput {
  email: string
  senha: string
}

export interface LoginResponse {
  usuario: {
    role: string
    tenantSlug: string | null
    mustChangePassword: boolean
  }
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  const json = await api.post<{ data: LoginResponse } | LoginResponse>('auth/login', input)
  return ('data' in json ? json.data : json) as LoginResponse
}
