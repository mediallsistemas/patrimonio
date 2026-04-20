export interface JWTPayload {
  sub: string          // userId
  email: string
  nome: string
  role: 'super_admin' | 'tenant_admin' | 'operator' | 'operator_patrimonio' | 'viewer'
  tenantId: string | null   // null = super_admin
  tenantSlug: string | null
  sistemas: string[]        // ["linensistem", "feedbackforms"]
  iat?: number
  exp?: number
}
