export interface JWTPayload {
  sub: string          // userId
  email: string
  nome: string
  role: 'super_admin' | 'tenant_admin' | 'operator' | 'operator_patrimonio' | 'operator_forms' | 'viewer'
  tenantId: string | null   // null = super_admin
  tenantSlug: string | null
  sistemas: string[]
  mustChangePassword?: boolean
  tenantIds?: string[]
  iat?: number
  exp?: number
}

// Roles que pertencem ao LinenSistem.
// Ao adicionar um novo role neste sistema, basta incluir nesta lista.
export const LINENSISTEM_ROLES = [
  'super_admin',
  'tenant_admin',
  'operator',
  'operator_patrimonio',
  'viewer',
] as const

export type LinenSistemRole = typeof LINENSISTEM_ROLES[number]
