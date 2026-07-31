import { badRequest, ok, serverError, unauthorized } from '@/lib/api-response'
import { hashPassword, setSessionCookie } from '@/lib/auth'
import type { SessionPayload } from '@/lib/auth'
import { verifyAuth } from '@/modules/auth/auth.guards'
import { authPool } from '@/lib/db-auth'

interface UsuarioRow {
  id: string
  senhaHash: string
  email: string
  nome: string
  role: string
  tenantId: string | null
  tenantSlug: string | null
  sistemas: string[]
  tenantsExtras: string[]
}

export async function POST(req: Request): Promise<Response> {
  try {
    const payload = await verifyAuth(req)
    if (!payload) return unauthorized()

    const body = await req.json()
    const { novaSenha } = body as { novaSenha?: string }

    if (!novaSenha) {
      return badRequest('novaSenha é obrigatória')
    }
    if (novaSenha.length < 6) {
      return badRequest('A nova senha deve ter pelo menos 6 caracteres')
    }

    const result = await authPool.query<UsuarioRow>(
      `SELECT u.id, u."senhaHash", u.email, u.nome, u.role, u."tenantId",
              COALESCE(u.sistemas, ARRAY[]::text[]) AS sistemas,
              COALESCE(u."tenantsExtras", ARRAY[]::text[]) AS "tenantsExtras",
              t.slug AS "tenantSlug"
       FROM usuarios u
       LEFT JOIN tenants t ON t.id = u."tenantId"
       WHERE u.id = $1 LIMIT 1`,
      [payload.sub],
    )
    const usuario = result.rows[0] ?? null
    if (!usuario) return unauthorized()

    const novoHash = await hashPassword(novaSenha)
    await authPool.query(
      `UPDATE usuarios SET "senhaHash" = $1, "mustChangePassword" = false WHERE id = $2`,
      [novoHash, usuario.id],
    )

    // Reemite o cookie JWT com mustChangePassword = false.
    // IMPORTANTE: reconstrói tenantIds igual ao login — sem isso o admin_multi
    // que troca a senha "perdia" as unidades extras e todos os seletores
    // colapsavam para a unidade primária.
    const tenantsExtras = usuario.tenantsExtras ?? []
    const tenantIds = tenantsExtras.length > 0
      ? [usuario.tenantId, ...tenantsExtras].filter((id): id is string => id !== null)
      : undefined

    const newSession: SessionPayload = {
      sub:                usuario.id,
      userId:             usuario.id,
      email:              usuario.email,
      nome:               usuario.nome,
      role:               usuario.role,
      tenantId:           usuario.tenantId,
      tenantSlug:         usuario.tenantSlug,
      sistemas:           usuario.sistemas,
      mustChangePassword: false,
      ...(tenantIds ? { tenantIds } : {}),
    }
    await setSessionCookie(newSession)

    return ok(null, 'Senha alterada com sucesso')
  } catch (error) {
    console.error('[me/password] erro:', error)
    return serverError('me/password POST failed')
  }
}
