import { NextResponse } from 'next/server'
import { authPool } from '@/lib/db-auth'
import { comparePassword, setSessionCookie, SessionPayload } from '@/lib/auth'

interface UsuarioRow {
  id: string
  email: string
  nome: string
  senhaHash: string
  role: string
  tenantId: string | null
  ativo: boolean
  mustChangePassword: boolean
  sistemas: string[]
  tenantSlug: string | null
  tenantsExtras: string[]
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // Aceita "username" (principal), "login" (SPA FeedbackForms) ou "email" (legado)
    const login = (body.username ?? body.login ?? body.email ?? '').trim().toLowerCase()
    // Aceita "senha" (LinenSistem SSR) e "password" (SPA FeedbackForms)
    const senha = (body.senha ?? body.password ?? '').trim()

    if (!login || !senha) {
      return NextResponse.json({ error: 'Usuário e senha obrigatórios' }, { status: 400 })
    }

    const result = await authPool.query<UsuarioRow>(
      `SELECT u.id, u.email, u.nome, u."senhaHash", u.role, u."tenantId", u.ativo,
              COALESCE(u."mustChangePassword", false) AS "mustChangePassword",
              COALESCE(u.sistemas, ARRAY[]::text[]) AS sistemas,
              COALESCE(u."tenantsExtras", ARRAY[]::text[]) AS "tenantsExtras",
              t.slug AS "tenantSlug"
       FROM usuarios u
       LEFT JOIN tenants t ON t.id = u."tenantId"
       WHERE u.username = $1 OR u.email = $1
       LIMIT 1`,
      [login],
    )

    const usuario = result.rows[0] ?? null

    if (!usuario || !usuario.ativo) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const senhaValida = await comparePassword(senha, usuario.senhaHash)
    if (!senhaValida) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const tenantsExtras = usuario.tenantsExtras ?? []
    const tenantIds = tenantsExtras.length > 0
      ? [usuario.tenantId, ...tenantsExtras].filter((id): id is string => id !== null)
      : undefined

    const payload: SessionPayload = {
      sub:                usuario.id,
      userId:             usuario.id,
      email:              usuario.email,
      nome:               usuario.nome,
      role:               usuario.role,
      tenantId:           usuario.tenantId,
      tenantSlug:         usuario.tenantSlug,
      sistemas:           usuario.sistemas,
      mustChangePassword: usuario.mustChangePassword,
      ...(tenantIds ? { tenantIds } : {}),
    }

    const accessToken = await setSessionCookie(payload)

    return NextResponse.json({
      accessToken,
      user: {
        id:         usuario.id,
        name:       usuario.nome,
        email:      usuario.email,
        role:       usuario.role,
        tenantId:   usuario.tenantId,
        tenantSlug: usuario.tenantSlug,
      },
      usuario: {
        id:                 usuario.id,
        nome:               usuario.nome,
        email:              usuario.email,
        role:               usuario.role,
        tenantSlug:         usuario.tenantSlug,
        mustChangePassword: usuario.mustChangePassword,
      },
    })
  } catch (err) {
    console.error('Erro no login:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
