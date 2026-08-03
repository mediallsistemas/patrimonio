# `src/lib` — Utilitários de infraestrutura

Camada de utilitários compartilhados. **A maior parte é server-only** (Prisma, pool
Postgres, cookies, JWT) e **nunca pode ser importada em client components ou hooks**.
Porém, três arquivos desta pasta são **client-safe por design** e são de fato
importados no cliente (`error-message.ts`, `ronda-tipos.ts`, `rondas-admin-utils.ts`)
— ver a tabela de classificação no fim. Isso diverge da regra genérica do CLAUDE.md
("lib nunca importado em client"); o código real faz essa distinção.

---

## `api-response.ts` — helpers de resposta HTTP *(server-only)*

Toda `route.ts` deve responder por estes helpers — nunca `NextResponse.json()` direto.

```ts
ok<T>(data: T, message?: string)   // 200 → { data, message }
created<T>(data: T)                // 201 → { data }
noContent()                        // 204 (corpo vazio)
badRequest(error: unknown)         // 400 → { error }
conflict(error: string)            // 409 → { error }
unauthorized()                     // 401 → { error: 'Não autorizado' }
forbidden()                        // 403 → { error: 'Sem permissão' }
notFound(resource = 'Recurso')     // 404 → { error: '<resource> não encontrado' }
serverError(error: unknown)        // 500 → { error: 'Erro interno' } (loga a msg real com '[server-error]')
```

Contrato de shape: sucesso `{ data, message? }`, erro `{ error }`. `serverError`
nunca vaza a mensagem interna para o cliente — só loga no servidor.

**Quem usa:** praticamente todas as rotas em `src/app/api/**/route.ts` (~40 arquivos).
Exceções conhecidas que ainda usam `NextResponse.json` direto: `api/auth/login`,
`api/auth/logout`, `api/rondas/expirar` (divergência do padrão).

---

## `auth.ts` — JWT + cookie de sessão + senha *(server-only)*

```ts
interface SessionPayload {
  sub: string; userId: string; email: string; nome: string
  role: string; tenantId: string | null; tenantSlug: string | null
  sistemas: string[]; mustChangePassword?: boolean
  tenantIds?: string[]   // admin_multi/viewer com múltiplos tenants
}

signToken(payload: SessionPayload): Promise<string>          // HS256, exp 4h
verifyToken(token: string): Promise<SessionPayload | null>
getSession(): Promise<SessionPayload | null>                 // lê cookie via next/headers
setSessionCookie(payload: SessionPayload): Promise<string>   // httpOnly, sameSite lax, 4h
clearSessionCookie(): Promise<void>
hashPassword(password: string): Promise<string>              // bcrypt cost 10
comparePassword(password: string, hash: string): Promise<boolean>
export const SESSION_COOKIE = 'ls_session'
```

Valida `JWT_SECRET` no load do módulo (mínimo 32 chars — lança erro se ausente).
**Quem usa:** `api/auth/login|logout`, `api/me/password`, `api/rodadas/*`,
layouts SSR (`app/admin/layout.tsx`, `app/[tenantSlug]/layout.tsx`,
`app/viewer/*`), `modules/auth/auth.guards.ts`, `modules/usuarios`.

---

## `db.ts` — Prisma singleton *(server-only)*

```ts
export const prisma: PrismaClient   // singleton via global.__prisma (hot-reload safe)
```

**Quem usa:** todos os services em `src/modules/**` e algumas rotas legadas
(`api/auth/login`, `api/admin/tenants`).

---

## `db-auth.ts` — banco de autenticação *(server-only)*

O login consulta um banco separado (usuários/tenants compartilhados com o
FeedbackForms) via pool `pg` cru:

```ts
export { prisma as prismaAuth }     // alias do prisma principal (auth/tenants)
export const authPool: Pool         // pool pg de AUTH_DATABASE_URL (max 5, ssl, singleton global)
```

Lança erro se `AUTH_DATABASE_URL` não estiver definida.
**Quem usa:** `api/auth/login` (SQL cru na tabela `usuarios`), `api/me/password`,
`api/me/tenant(s)`, `api/trilogo/*`, `api/cron/sync-trilogo`,
`modules/{ambientes,auth/tenant-resolver,bens,pessoas,tenants,usuarios}`.

---

## `blocos-cache.ts` — cache em memória de blocos *(server-only)*

```ts
export const blocosCache: Map<string, { data: ...; at: number }>  // key = tenantId
export const BLOCOS_TTL = 5 * 60 * 1000                            // 5 min
invalidarCacheBlocos(tenantId: string): void
```

Cache por processo do resultado de `listarBlocos` (ambientes.service). Invalidado
pelas rotas de sync Trilogo. **Quem usa:** `api/me/blocos`,
`api/cron/sync-trilogo`, `api/admin/tenants/[id]/sync-trilogo`.
Limitação: como o rate limiter, é por instância de processo (não compartilhado).

---

## `crypto-utils.ts` — comparação timing-safe *(server-only por uso)*

```ts
timingSafeEqual(a: string, b: string): boolean
```

Comparação de strings resistente a timing attack (itera mesmo com tamanhos
diferentes). **Quem usa:** autenticação dos endpoints de cron
(`api/cron/sync-trilogo` via `Authorization: Bearer <CRON_SECRET>`,
`api/rondas/expirar` via header `x-cron-secret`).

---

## `error-message.ts` — erros amigáveis *(client-safe — usado no cliente)*

```ts
class ApiError extends Error { constructor(status: number, message: string) }
toUserMessage(error: unknown): string   // mapeia status HTTP → mensagem pt-BR
```

Tabela `HTTP_MESSAGES` cobre 400/401/403/404/409/413/429/500/503; trata também
`TypeError('Failed to fetch')` (sem conexão) e mensagens no formato `HTTP <n>`.
**Quem usa:** `services/api.ts` (lança `ApiError`), `hooks/useRondaBase.ts`,
`hooks/useInspecao.ts` (toasts de erro).

---

## `ronda-tipos.ts` — labels/cores de tipos de ocorrência *(client-safe)*

```ts
export const TIPO_OCORRENCIA: Record<string, { label: string; color: string }>
// eletrica | hidraulica | patrimonio → label pt-BR + classes Tailwind
```

**Quem usa:** `components/ui/ronda/{AmbienteOcorrenciaRow,OcorrenciaCard,OcorrenciaRow}.tsx`.

---

## `rondas-admin-utils.ts` — transformações de rondas para telas *(client-safe)*

```ts
interface GrupoRonda { label: string; rondas: Ronda[] }
interface OcorrenciaFlat { id, tipo, descricao, foto, trilogoChamado, bemPatrimony,
  bemDescricao, ambienteNome, ambienteId, ambienteConcluidoEm, rondaId,
  rondaIniciadoEm, tenantNome, criadoPorNome }

desnormalizarOcorrencias(rondas: Ronda[]): OcorrenciaFlat[]  // achata ronda→ambiente→ocorrência
agruparPorData(rondas: Ronda[]): GrupoRonda[]                // buckets Hoje/Ontem/dd/MM/yyyy
```

Funções puras (sem I/O). **Quem usa:** `app/admin/rondas/page.tsx`,
`app/ocorrencias/historico/page.tsx`, `app/viewer/rondas/page.tsx`,
`app/[tenantSlug]/ronda/historico/page.tsx`, `components/ui/ronda/OcorrenciaRow.tsx`.

---

## Classificação server-only × client-safe

| Arquivo | Server-only? | Motivo |
|---------|--------------|--------|
| `api-response.ts` | Sim | `next/server` |
| `auth.ts` | Sim | `next/headers`, JWT_SECRET, bcrypt |
| `db.ts` | Sim | PrismaClient |
| `db-auth.ts` | Sim | pool `pg`, AUTH_DATABASE_URL |
| `blocos-cache.ts` | Sim | cache do processo servidor |
| `crypto-utils.ts` | Neutro | puro, mas só usado no servidor (CRON_SECRET) |
| `error-message.ts` | **Não** | puro; importado por hooks e services client |
| `ronda-tipos.ts` | **Não** | constantes de UI; importado por componentes |
| `rondas-admin-utils.ts` | **Não** | funções puras; importado por páginas client |

Regra prática: nunca importar `auth.ts`, `db.ts`, `db-auth.ts`, `blocos-cache.ts`
ou `api-response.ts` em qualquer arquivo com `'use client'` — o build quebra ou
vaza segredo. Os três client-safe podem ser usados livremente.
