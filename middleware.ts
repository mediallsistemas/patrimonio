import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'linensistem-secret-change-in-production'
)
const SESSION_COOKIE = 'ls_session'

// Rotas totalmente públicas
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
]

// Rotas de primeiro nível que NÃO são tenantSlug
const APP_ROUTES = [
  '/ocorrencias',
  '/dashboard',
  '/cadastro',
  '/retirada',
  '/devolucao',
  '/inspecao',
  '/admin',
]

// Roles com acesso ao módulo de manutenção
const MANUTENCAO_ROLES = new Set(['super_admin', 'manutencao_admin', 'manutencao_user', 'tenant_admin'])

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Recursos estáticos e rotas públicas globais
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/models') ||
    pathname.startsWith('/icons') ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  ) {
    return NextResponse.next()
  }

  // ── Módulos públicos — sem autenticação necessária
  // hotelaria, retirada, cadastro e devolução são abertos antes do login
  const publicTenantModules = pathname.match(
    /^\/[a-z0-9-]+\/(hotelaria|retirada|cadastro|devolucao)(\/|$)/
  )
  if (publicTenantModules) {
    return NextResponse.next()
  }

  // ── Sem token: redireciona rotas públicas antes de exigir autenticação ──────
  const token = req.cookies.get(SESSION_COOKIE)?.value

  if (!token) {
    // raiz "/" sem token → /login
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    // rotas de app fixas sem token → login (não tratar como tenantSlug)
    const isAppRoute = APP_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))
    if (isAppRoute) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
    // /:tenantSlug ou /:tenantSlug/ sem token → hotelaria pública
    const tenantRootPublic = pathname.match(/^\/([a-z0-9-]+)\/?$/)
    if (tenantRootPublic) {
      return NextResponse.redirect(new URL(`/${tenantRootPublic[1]}/hotelaria`, req.url))
    }
    // qualquer outra rota sem token → login
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  let payload: { role?: string; tenantSlug?: string | null }
  try {
    const { payload: p } = await jwtVerify(token, JWT_SECRET)
    payload = p as typeof payload
  } catch (err) {
    const loginUrl = new URL('/login', req.url)
    const res = NextResponse.redirect(loginUrl)
    res.headers.set('x-debug', `jwt-failed:${String(err)}`)
    return res
  }

  const role = payload.role ?? ''
  const tenantSlug = payload.tenantSlug ?? null

  // ── Rota raiz "/" ─────────────────────────────────────────────────────────
  if (pathname === '/') {
    if (role === 'super_admin') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    if (tenantSlug) {
      return NextResponse.redirect(new URL(`/${tenantSlug}/manutencao`, req.url))
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }


  // ── /admin/* — apenas super_admin ─────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (role !== 'super_admin') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return NextResponse.next()
  }

  // ── /api/hotelaria/* — público, sem autenticação necessária ───────────────
  if (pathname.startsWith('/api/hotelaria/')) {
    return NextResponse.next()
  }

  // ── /api/* — deixa passar (APIs protegem internamente via getSession) ─────
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // ── /:tenantSlug/manutencao/* — requer role de manutenção ─────────────────
  const manutencaoMatch = pathname.match(/^\/([a-z0-9-]+)\/manutencao(\/|$)/)
  if (manutencaoMatch) {
    const slugFromPath = manutencaoMatch[1]

    if (!MANUTENCAO_ROLES.has(role)) {
      const res = NextResponse.redirect(new URL('/login', req.url))
      res.headers.set('x-debug', `blocked-role:${role}`)
      return res
    }

    if (role === 'super_admin') return NextResponse.next()

    if (tenantSlug !== slugFromPath) {
      const dest = tenantSlug
        ? new URL(`/${tenantSlug}/manutencao`, req.url)
        : new URL('/login', req.url)
      const res = NextResponse.redirect(dest)
      res.headers.set('x-debug', `slug-mismatch:token=${tenantSlug}:path=${slugFromPath}`)
      return res
    }

    return NextResponse.next()
  }

  // ── /:tenantSlug (home do tenant) — redireciona para módulo correto ───────
  const isAppRoute = APP_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))
  const tenantRootMatch = !isAppRoute && pathname.match(/^\/([a-z0-9-]+)\/?$/)
  if (tenantRootMatch) {
    const slugFromPath = tenantRootMatch[1]
    if (role === 'super_admin') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    if (MANUTENCAO_ROLES.has(role)) {
      return NextResponse.redirect(new URL(`/${slugFromPath}/manutencao`, req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
