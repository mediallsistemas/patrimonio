import { prisma } from '@/lib/db'
import type { JWTPayload } from './auth.types'

/**
 * Resolve tenantId a partir do JWT ou do query param tenantSlug.
 * Super admin pode passar tenantSlug para operar em nome de um tenant.
 * Retorna null se o tenant não for encontrado.
 */
export async function resolveTenantId(
  session: JWTPayload,
  tenantSlugParam?: string | null
): Promise<string | null> {
  // Usuário de tenant normal: usa o tenantId do JWT
  if (session.tenantId) return session.tenantId

  // Super admin: exige tenantSlug no query param para saber qual tenant operar
  if (!tenantSlugParam) return null

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlugParam },
    select: { id: true },
  })
  return tenant?.id ?? null
}
