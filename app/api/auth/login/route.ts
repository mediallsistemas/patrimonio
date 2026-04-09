import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { comparePassword, setSessionCookie, SessionPayload } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = (body.email ?? '').trim()
    // Aceita "senha" (LinenSistem SSR) e "password" (SPA FeedbackForms)
    const senha = (body.senha ?? body.password ?? '').trim()

    if (!email || !senha) {
      return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
      include: { tenant: true },
    })

    if (!usuario || !usuario.ativo) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const senhaValida = await comparePassword(senha, usuario.senhaHash)
    if (!senhaValida) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const payload: SessionPayload = {
      sub:        usuario.id,
      userId:     usuario.id,
      email:      usuario.email,
      nome:       usuario.nome,
      role:       usuario.role,
      tenantId:   usuario.tenantId,
      tenantSlug: usuario.tenant?.slug ?? null,
      sistemas:   (usuario as unknown as { sistemas: string[] }).sistemas ?? [],
    }

    const accessToken = await setSessionCookie(payload)

    return NextResponse.json({
      // Formato esperado pela SPA FeedbackForms
      accessToken,
      user: {
        id:         usuario.id,
        name:       usuario.nome,
        email:      usuario.email,
        role:       usuario.role,
        tenantId:   usuario.tenantId,
        tenantSlug: usuario.tenant?.slug ?? null,
      },
      // Mantido para compatibilidade com o Next.js SSR do LinenSistem
      usuario: {
        id:         usuario.id,
        nome:       usuario.nome,
        email:      usuario.email,
        role:       usuario.role,
        tenantSlug: usuario.tenant?.slug ?? null,
      },
    })
  } catch (err) {
    console.error('Erro no login:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
