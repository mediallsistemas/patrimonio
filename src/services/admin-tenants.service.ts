import { api } from '@/services/api'

export interface Tenant {
  id: string
  slug: string
  nome: string
  ativo?: boolean
  criadoEm?: string
  linensistem?: boolean
  _count?: { usuarios: number }
}

export interface CreateTenantInput {
  nome: string
  slug: string
  trilogoCompanyId?: number
  trilogoProjectName?: string
}

export async function listarTenants(): Promise<Tenant[]> {
  const json = await api.get<{ data: Tenant[] } | Tenant[]>('admin/tenants')
  if (Array.isArray(json)) return json
  const typed = json as { data?: Tenant[] }
  return Array.isArray(typed.data) ? typed.data : []
}

export async function criarTenant(input: CreateTenantInput): Promise<Tenant> {
  const json = await api.post<{ data: Tenant } | Tenant>('admin/tenants', input)
  return ('data' in json ? json.data : json) as Tenant
}
