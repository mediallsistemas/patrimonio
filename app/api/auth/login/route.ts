import { signToken } from '@/lib/auth'
import type { SessionPayload } from '@/lib/auth'
import { badRequest, unauthorized, serverError } from '@/lib/api-response'
import { autenticarUsuario } from '@/modules/auth/auth.service'
import { NextResponse } from 'next/server'

const SESSION_COOKIE = 'ls_session'
const EXPIRES_IN = 60 * 60 * 24 // 24h

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json()
    // Aceita "login" (username ou email) ou "email" por compatibilidade
    const login = (body.login ?? body.email ?? '').trim()
    // Accepts "senha" (LinenSistem SSR) and "password" (FeedbackForms SPA)
    const senha = (body.senha ?? body.password ?? '').trim()

    if (!login || !senha) return badRequest('Login e senha obrigatórios')

    const ip = req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const usuario = await autenticarUsuario(login, senha, ip)
    if (!usuario) return unauthorized()

    const payload: SessionPayload = {
      sub:        usuario.id,
      userId:     usuario.id,
      email:      usuario.email,
      nome:       usuario.nome,
      role:       usuario.role,
      tenantId:   usuario.tenantId,
      tenantSlug: usuario.tenant?.slug ?? null,
    }

    const accessToken = await signToken(payload)

    const res = NextResponse.json({
      data: {
        // Format expected by FeedbackForms SPA
        accessToken,
        user: {
          id:         usuario.id,
          name:       usuario.nome,
          email:      usuario.email,
          role:       usuario.role,
          tenantId:   usuario.tenantId,
          tenantSlug: usuario.tenant?.slug ?? null,
        },
        // Kept for LinenSistem SSR compatibility
        usuario: {
          id:              usuario.id,
          nome:            usuario.nome,
          email:           usuario.email,
          role:            usuario.role,
          tenantSlug:      usuario.tenant?.slug ?? null,
          mustChangePassword: usuario.mustChangePassword ?? false,
        },
      },
    }, { status: 200 })

    res.cookies.set(SESSION_COOKIE, accessToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   EXPIRES_IN,
      path:     '/',
    })

    return res
  } catch (error) {
    console.error('[login] erro interno:', error)
    return serverError('login failed')
  }
}
