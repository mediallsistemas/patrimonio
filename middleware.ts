import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'linensistem-secret-change-in-production'
)
const SESSION_COOKIE = 'ls_session'

const ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean)
)

function applyCors(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get('origin') ?? ''
  if (ALLOWED_ORIGINS.has(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin)
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    res.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  return res
}

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
const MANUTENCAO_ROLES = new Set(['super_admin', 'manutencao_admin', 'manutencao_user', 'tenant_admin', 'operator'])

// ── Rate limiting simples em memória ──────────────────────────────────────────
// Nota: em produção com múltiplas instâncias, usar Redis (upstash/redis ou similar).
// Este rate limiter funciona por instância de processo — suficiente para single-process PM2.
const rateLimitMap = new Map<string, { count: number; reset: number }>()

const RATE_LIMIT_RULES: Array<{ path: string; maxReqs: number; windowMs: number }> = [
  { path: '/api/auth/login', maxReqs: 10, windowMs: 60_000 },
  { path: '/api/feedback/form-responses', maxReqs: 5, windowMs: 60_000 },
]

// Evita memory leak: remove entradas expiradas a cada N chamadas
let _rlCleanupCounter = 0
const RL_CLEANUP_INTERVAL = 500

function maybeCleanupRateLimitMap(): void {
  if (++_rlCleanupCounter < RL_CLEANUP_INTERVAL) return
  _rlCleanupCounter = 0
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.reset) rateLimitMap.delete(key)
  }
}

function checkRateLimit(ip: string, path: string): boolean {
  maybeCleanupRateLimitMap()

  const rule = RATE_LIMIT_RULES.find((r) => path === r.path || path.startsWith(r.path + '/'))
  if (!rule) return true

  const key = `${ip}:${rule.path}`
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.reset) {
    rateLimitMap.set(key, { count: 1, reset: now + rule.windowMs })
    return true
  }

  if (entry.count >= rule.maxReqs) return false

  entry.count++
  return true
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Preflight CORS — responde imediatamente
  if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    return applyCors(req, new NextResponse(null, { status: 204 }))
  }

  // Recursos estáticos e rotas públicas globais
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/models') ||
    pathname.startsWith('/icons') ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  ) {
    // Rate limiting em rotas públicas de escrita
    if (req.method === 'POST') {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
      if (!checkRateLimit(ip, pathname)) {
        return applyCors(req, new NextResponse(
          JSON.stringify({ error: 'Muitas tentativas. Aguarde um momento.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } },
        ))
      }
    }
    return applyCors(req, NextResponse.next())
  }

  // Rate limiting para POST em rotas de feedback (pré-auth)
  if (req.method === 'POST' && pathname.startsWith('/api/feedback/form-responses')) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
    if (!checkRateLimit(ip, pathname)) {
      return new NextResponse(
        JSON.stringify({ error: 'Muitas tentativas. Aguarde um momento.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      )
    }
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
    console.error('[middleware] jwtVerify falhou para', pathname, '| token prefix:', token?.substring(0, 20), '| err:', err instanceof Error ? err.message : err)
    const loginUrl = new URL('/login', req.url)
    const res = NextResponse.redirect(loginUrl)
    res.cookies.delete(SESSION_COOKIE)
    return res
  }

  const role = payload.role ?? ''
  const tenantSlug = payload.tenantSlug ?? null

  // ── Rota raiz "/" ─────────────────────────────────────────────────────────
  if (pathname === '/') {
    if (role === 'super_admin' || role === 'tenant_admin') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    if (MANUTENCAO_ROLES.has(role) && tenantSlug) {
      return NextResponse.redirect(new URL(`/${tenantSlug}/manutencao`, req.url))
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // ── /admin/tenants/* — apenas super_admin ────────────────────────────────
  if (pathname.startsWith('/admin/tenants')) {
    if (role !== 'super_admin') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return NextResponse.next()
  }

  // ── /admin/* — super_admin e tenant_admin ─────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (role !== 'super_admin' && role !== 'tenant_admin') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return NextResponse.next()
  }

  // ── /api/hotelaria/* — público, sem autenticação necessária ───────────────
  if (pathname.startsWith('/api/hotelaria/')) {
    return applyCors(req, NextResponse.next())
  }

  // ── /api/* — deixa passar (APIs protegem internamente via verifyAuth) ──────
  if (pathname.startsWith('/api/')) {
    return applyCors(req, NextResponse.next())
  }

  // ── /:tenantSlug/manutencao/* — requer role de manutenção ─────────────────
  const manutencaoMatch = pathname.match(/^\/([a-z0-9-]+)\/manutencao(\/|$)/)
  if (manutencaoMatch) {
    const slugFromPath = manutencaoMatch[1]
    if (!MANUTENCAO_ROLES.has(role)) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    if (role === 'super_admin') return NextResponse.next()

    if (tenantSlug !== slugFromPath) {
      const dest = tenantSlug
        ? new URL(`/${tenantSlug}/manutencao`, req.url)
        : new URL('/login', req.url)
      return NextResponse.redirect(dest)
    }

    return NextResponse.next()
  }

  // ── /:tenantSlug (home do tenant) — redireciona para módulo correto ───────
  const isAppRoute = APP_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))
  const tenantRootMatch = !isAppRoute && pathname.match(/^\/([a-z0-9-]+)\/?$/)
  if (tenantRootMatch) {
    if (role === 'super_admin') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    if (MANUTENCAO_ROLES.has(role) && tenantSlug) {
      return NextResponse.redirect(new URL(`/${tenantSlug}/manutencao`, req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
