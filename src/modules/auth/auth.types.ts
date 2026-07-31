export interface JWTPayload {
  sub: string          // userId
  email: string
  nome: string
  // admin_multi = admin multi-unidade (administra os tenants de tenantIds).
  // viewer = nome LEGADO de admin_multi (o rename viewer→admin_multi aconteceu
  // no repo linensistem; usuários antigos no banco de auth ainda podem carregar
  // 'viewer') — os dois são tratados como equivalentes até a migração do banco.
  role: 'super_admin' | 'tenant_admin' | 'admin_multi' | 'operator' | 'operator_patrimonio' | 'operator_forms' | 'viewer'
  tenantId: string | null   // null = super_admin
  tenantSlug: string | null
  sistemas: string[]
  mustChangePassword?: boolean
  // Para admin_multi/viewer: [tenantId, ...tenantsExtras] resolvido no login
  tenantIds?: string[]
  iat?: number
  exp?: number
}

// Roles que pertencem ao LinenSistem.
// Ao adicionar um novo role neste sistema, basta incluir nesta lista.
export const LINENSISTEM_ROLES = [
  'super_admin',
  'tenant_admin',
  'admin_multi',
  'operator',
  'operator_patrimonio',
  'viewer',
] as const

export type LinenSistemRole = typeof LINENSISTEM_ROLES[number]

// Roles administrativas — acesso ao painel /admin. Todas veem as MESMAS telas;
// o que muda é o alcance: super_admin = todas as unidades, admin_multi/viewer =
// as unidades de tenantIds, tenant_admin = a própria unidade.
// (viewer segue aqui como alias legado de admin_multi.)
export const ADMIN_ROLES = ['super_admin', 'tenant_admin', 'admin_multi', 'viewer'] as const
export type AdminRole = typeof ADMIN_ROLES[number]
