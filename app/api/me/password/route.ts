import { badRequest, ok, serverError, unauthorized } from '@/lib/api-response'
import { comparePassword, hashPassword } from '@/lib/auth'
import { verifyAuth } from '@/modules/auth/auth.guards'
import { prisma } from '@/lib/db'

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

    const usuario = await prisma.usuario.findUnique({ where: { id: payload.sub } })
    if (!usuario) return unauthorized()

    const senhaValida = await comparePassword(senhaAtual, usuario.senhaHash)
    if (!senhaValida) return badRequest('Senha atual incorreta')

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senhaHash: await hashPassword(novaSenha),
        mustChangePassword: false,
      },
    })

    return ok(null, 'Senha alterada com sucesso')
  } catch (error) {
    console.error('[me/password] erro:', error)
    return serverError(error)
  }
}
