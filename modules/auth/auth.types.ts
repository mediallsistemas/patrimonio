export interface JWTPayload {
  sub: string          // userId
  email: string
  nome: string
  role: 'super_admin' | 'tenant_admin' | 'operator' | 'operator_patrimonio' | 'operator_forms' | 'viewer'
  tenantId: string | null   // null = super_admin
  tenantSlug: string | null
  iat?: number
  exp?: number
}

// Roles que pertencem ao LinenSistem.
// Roles de outros sistemas (operator_forms, rh, viewer, etc.) não aparecem aqui.
// Ao adicionar um novo role neste sistema, basta incluir nesta lista.
export const LINENSISTEM_ROLES = [
  'super_admin',
  'tenant_admin',
  'operator',
  'operator_patrimonio',
] as const

export type LinenSistemRole = typeof LINENSISTEM_ROLES[number]
