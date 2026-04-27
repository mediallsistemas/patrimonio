import { badRequest, ok, serverError, unauthorized } from '@/lib/api-response'
import { comparePassword, hashPassword } from '@/lib/auth'
import { verifyAuth } from '@/modules/auth/auth.guards'
import { authPool } from '@/lib/db-auth'

interface UsuarioRow { id: string; senhaHash: string }

export async function POST(req: Request): Promise<Response> {
  try {
    const payload = await verifyAuth(req)
    if (!payload) return unauthorized()

    const body = await req.json()
    const { senhaAtual, novaSenha } = body as { senhaAtual?: string; novaSenha?: string }

    if (!senhaAtual || !novaSenha) {
      return badRequest('senhaAtual e novaSenha são obrigatórios')
    }
    if (novaSenha.length < 6) {
      return badRequest('A nova senha deve ter pelo menos 6 caracteres')
    }

    console.log('[me/password] userId:', payload.sub)

    const result = await authPool.query<UsuarioRow>(
      `SELECT id, "senhaHash" FROM usuarios WHERE id = $1 LIMIT 1`,
      [payload.sub],
    )
    const usuario = result.rows[0] ?? null
    console.log('[me/password] usuario encontrado:', !!usuario)
    if (!usuario) return unauthorized()

    const senhaValida = await comparePassword(senhaAtual, usuario.senhaHash)
    console.log('[me/password] senha valida:', senhaValida)
    if (!senhaValida) return badRequest('Senha atual incorreta')

    const novoHash = await hashPassword(novaSenha)
    const updateResult = await authPool.query(
      `UPDATE usuarios SET "senhaHash" = $1, "mustChangePassword" = false WHERE id = $2`,
      [novoHash, usuario.id],
    )
    console.log('[me/password] rows updated:', updateResult.rowCount)

    return ok(null, 'Senha alterada com sucesso')
  } catch (error) {
    console.error('[me/password] erro:', error)
    return serverError(error)
  }
}
