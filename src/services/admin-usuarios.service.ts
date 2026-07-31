import { api } from '@/services/api'

export interface Tenant {
  id: string
  slug: string
  nome: string
}

export interface Usuario {
  id: string
  email: string
  nome: string
  role: string
  ativo: boolean
  criadoEm: string
  tenantId: string | null
  tenant: Tenant | null
}

export interface CreateUsuarioInput {
  nome: string
  username: string
  senha: string
  role: string
  tenantId?: string
  /** admin_multi: unidades além da primária */
  tenantsExtras?: string[]
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const json = await api.get<{ data: Usuario[] } | Usuario[]>('admin/usuarios')
  return (Array.isArray(json) ? json : (json as { data: Usuario[] }).data) ?? []
}

export async function criarUsuario(input: CreateUsuarioInput): Promise<Usuario> {
  const json = await api.post<{ data: Usuario } | Usuario>('admin/usuarios', input)
  return ('data' in json ? json.data : json) as Usuario
}

export async function resetSenhaUsuario(id: string): Promise<{ novaSenha: string }> {
  const json = await api.post<{ data: { novaSenha: string } } | { novaSenha: string }>(`admin/usuarios/${id}/reset-password`, {})
  return ('data' in json ? json.data : json) as { novaSenha: string }
}
