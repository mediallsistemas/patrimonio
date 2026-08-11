import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET env var is missing or too short (min 32 chars). ' +
      'Generate with: openssl rand -base64 64'
    )
  }
  return new TextEncoder().encode(secret)
}

const JWT_SECRET = getJwtSecret()
const SESSION_COOKIE = 'ls_session'

// Whitelist of trusted proxy IPs — extend as needed for load balancers / Cloudflare
const TRUSTED_PROXIES = new Set(['127.0.0.1', '::1'])

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    // Take the leftmost IP (actual client) — only when behind a trusted proxy
    const remoteIp = req.headers.get('x-real-ip') ?? ''
    if (remoteIp && TRUSTED_PROXIES.has(remoteIp)) {
      const first = forwarded.split(',')[0]?.trim()
      if (first && /^[\d.]+$|^[a-f0-9:]+$/i.test(first)) return first
    }
  }
  // Fallback: use x-real-ip or default
  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp && /^[\d.]+$|^[a-f0-9:]+$/i.test(realIp)) return realIp
  return '127.0.0.1'
}

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
  '/mudar-senha',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/me/password',
  '/bem',
  '/api/public',
  // Cron do Trílogo: a Vercel (e PM2/curl) chama SEM cookie de sessão, então cairia
  // no catch-all "sem token → /login" abaixo e nunca chegaria ao handler — era por
  // isso que a sincronização não rodava. O próprio route exige Authorization:
  // Bearer <CRON_SECRET>, então liberar aqui não abre nada.
  '/api/cron',
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
const MANUTENCAO_ROLES = new Set(['super_admin', 'manutencao_admin', 'manutencao_user', 'tenant_admin', 'admin_multi', 'operator'])

// Roles com acesso ao painel /admin (viewer = alias legado de admin_multi)
const ADMIN_PANEL_ROLES = new Set(['super_admin', 'tenant_admin', 'admin_multi', 'viewer'])

// ── Rate limiting simples em memória ──────────────────────────────────────────
// Nota: em produção com múltiplas instâncias, usar Redis (upstash/redis ou similar).
// Este rate limiter funciona por instância de processo — suficiente para single-process PM2.
const rateLimitMap = new Map<string, { count: number; reset: number }>()

const RATE_LIMIT_RULES: Array<{ path: string; maxReqs: number; windowMs: number }> = [
  { path: '/api/auth/login',             maxReqs: 20, windowMs: 60_000  }, // 20/min
  { path: '/api/feedback/form-responses', maxReqs: 5,  windowMs: 60_000  },
  { path: '/api/public/bens',            maxReqs: 30, windowMs: 60_000  },
  { path: '/api/hotelaria',              maxReqs: 20, windowMs: 60_000  }, // public biometric endpoints
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
    // Rate limiting em rotas públicas (GET e POST)
    const ip = getClientIp(req)
    if (!checkRateLimit(ip, pathname)) {
      return applyCors(req, new NextResponse(
        JSON.stringify({ error: 'Muitas tentativas. Aguarde um momento.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      ))
    }
    return applyCors(req, NextResponse.next())
  }

  // Rate limiting para POST em rotas de feedback (pré-auth)
  if (req.method === 'POST' && pathname.startsWith('/api/feedback/form-responses')) {
    const ip = getClientIp(req)
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

  let payload: { role?: string; tenantSlug?: string | null; mustChangePassword?: boolean }
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

  // Força troca de senha antes de acessar qualquer rota protegida
  if (payload.mustChangePassword && pathname !== '/mudar-senha') {
    return NextResponse.redirect(new URL('/mudar-senha', req.url))
  }

  const role = payload.role ?? ''
  const tenantSlug = payload.tenantSlug ?? null

  // ── Rota raiz "/" ─────────────────────────────────────────────────────────
  if (pathname === '/') {
    if (ADMIN_PANEL_ROLES.has(role)) {
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
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    return NextResponse.next()
  }

  // ── /admin/* — papéis administrativos (escopo aplicado no backend) ────────
  if (pathname.startsWith('/admin')) {
    if (!ADMIN_PANEL_ROLES.has(role)) {
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

    // admin_multi navega entre as unidades que administra pelo slug da URL;
    // a validação fina (slug ∈ tenantIds) fica no SSR/API via tenantIds[].
    if (role === 'admin_multi' || role === 'viewer') return NextResponse.next()

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
