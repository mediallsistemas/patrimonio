export interface JWTPayload {
  sub: string          // userId
  email: string
  nome: string
  role: 'super_admin' | 'tenant_admin' | 'viewer'
  tenantId: string | null   // null = super_admin
  tenantSlug: string | null
  iat?: number
  exp?: number
}
