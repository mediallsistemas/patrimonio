# LinenSistem — Agent Instructions

This is a multi-tenant platform built with **Next.js 14 (App Router) + Prisma + PostgreSQL**.
It absorbs the backend of FeedbackForms (previously NestJS, now discarded). The FeedbackForms
SPA (React + Vite) calls this project's API routes.

Read `INTEGRATION_PLAN.md` for full architectural context and the current migration status.

---

## Stack

- **Framework:** Next.js 14, App Router
- **ORM:** Prisma (PostgreSQL)
- **Auth:** JWT (cookie `ls_session` + Bearer header)
- **Styling:** Tailwind CSS
- **Language:** TypeScript (strict — no `any`)

---

## Folder Responsibilities — One Rule Per Layer

```
route.ts        → receive request, verify auth, call service, return response (NO business logic)
modules/        → all business logic and Prisma queries (services + types per domain)
components/     → dumb UI — props in, events out, NO fetch calls
hooks/          → state + client-side service calls — pages and components consume hooks
services/       → client-side fetch wrappers targeting /api/* routes
lib/            → shared server utilities (db singleton, jwt helpers, api-response helpers)
```

Never cross these boundaries. A `route.ts` that contains a Prisma call is wrong.
A component that calls `fetch` directly is wrong.

---

## Import Order (always follow this)

```ts
// 1. React / Next.js
import { useState } from 'react'
import { NextResponse } from 'next/server'

// 2. External libraries
import { format } from 'date-fns'

// 3. Internal lib / modules / utils  (use @/ aliases)
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, unauthorized } from '@/lib/api-response'

// 4. Components
import { Button } from '@/components/ui/button'

// 5. Types (import type)
import type { JWTPayload } from '@/modules/auth/auth.types'
```

---

## Naming Conventions

| Type | Convention | Example |
|---|---|---|
| React component | PascalCase | `ModalConfirm.tsx` |
| Hook | camelCase + `use` prefix | `useFormResponse.ts` |
| Server service | kebab-case + `.service.ts` | `feedback.service.ts` |
| Client service | kebab-case + `.service.ts` | `form-response.service.ts` |
| Types file | `.types.ts`, PascalCase interfaces | `feedback.types.ts` |
| API route folder | plural noun (resource name) | `/api/feedback/form-responses/` |
| DB table (Prisma `@@map`) | snake_case, plural | `respostas_formulario` |
| DB column (`@map`) | snake_case | `tenant_id`, `criado_por_id` |

---

## Security Rules — Non-Negotiable

### Authentication on every protected route

```ts
// app/api/resource/route.ts
import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, unauthorized } from '@/lib/api-response'

export async function GET(req: Request) {
  const session = await verifyAuth(req, ['tenant_admin', 'super_admin'])
  if (!session) return unauthorized()
  // proceed
}
```

`verifyAuth()` reads the Bearer header or `ls_session` cookie. Always pass the required roles.

### Tenant isolation — mandatory on every Prisma query

```ts
// CORRECT
const items = await prisma.rodada.findMany({
  where: { tenantId: session.tenantId }
})

// WRONG — never query without tenant filter on multi-tenant tables
const items = await prisma.rodada.findMany()
```

Super admin has `tenantId: null`. For super admin queries, either omit the filter explicitly
or pass an explicit tenantId when scoping to a single tenant.

### criadoPorId always comes from the JWT — never from the request body

```ts
// CORRECT
await rodadaService.criar(session.tenantId!, session.sub)

// WRONG
const { criadoPorId } = await req.json()  // never trust client-supplied user IDs
```

### Never expose internals to the client

- Catch all errors in services, log them server-side, return `serverError()` to the client.
- Never send Prisma error messages, stack traces, or internal model details in responses.

---

## API Response Shape — Always Use the Helpers

Every route.ts must use `lib/api-response.ts`. Never use `NextResponse.json()` directly.

```ts
// lib/api-response.ts — helpers available
ok(data, message?)       // 200
created(data)            // 201
badRequest(error)        // 400
unauthorized()           // 401
forbidden()              // 403
notFound(resource?)      // 404
serverError(error)       // 500
```

Shape contract:
```ts
// success
{ data: T, message?: string }

// error
{ error: string, details?: unknown }
```

---

## JWT Payload Contract

```ts
interface JWTPayload {
  sub: string             // userId
  email: string
  nome: string
  role: 'super_admin' | 'tenant_admin' | 'viewer'
  tenantId: string | null   // null = super_admin
  tenantSlug: string | null
  iat?: number
  exp?: number
}
```

This contract is shared with the FeedbackForms SPA. Do not add or rename fields without
updating both projects.

---

## Audit Fields — Required on User-Action Models

| Situation | Required fields |
|---|---|
| Any creation by authenticated user | `criadoPorId String` + relation to `Usuario` + `criadoEm DateTime @default(now())` |
| Mutable model (status, editable data) | + `atualizadoEm DateTime @updatedAt` + `atualizadoPorId String?` |
| Logical deletion | + `deletadoEm DateTime?` |
| Public operation (no auth) | `criadoPorId String?` (nullable) |

---

## Database Conventions

- Primary key: always `id String @id @default(uuid())`
- Indexes: every model with `tenantId` must have at minimum `@@index([tenantId])`
- Add compound indexes for frequent query patterns: `@@index([tenantId, criadoEm])`, etc.
- Migrations: one migration per feature domain. Never mix unrelated models in one migration.
- Never use `prisma db push` on production. Always `prisma migrate deploy`.
- Never delete old migration files.

---

## Error Handling Pattern

```ts
// modules/domain/domain.service.ts
export async function getItems(tenantId: string) {
  try {
    return await prisma.item.findMany({ where: { tenantId } })
  } catch (error) {
    console.error('[domain.service] getItems:', error)
    throw error  // route.ts catches and returns serverError()
  }
}

// app/api/domain/route.ts
export async function GET(req: Request) {
  const session = await verifyAuth(req, ['tenant_admin'])
  if (!session) return unauthorized()
  try {
    const items = await domainService.getItems(session.tenantId!)
    return ok(items)
  } catch {
    return serverError('getItems failed')
  }
}
```

---

## Environment Variables

- All variables documented in `.env.example`.
- Server-only variables: no prefix.
- Client-exposed variables: `NEXT_PUBLIC_` prefix.
- Never hardcode secrets. Never commit `.env` or `.env.production`.
- `JWT_SECRET` must be identical in LinenSistem and FeedbackForms.
- `CORS_ORIGINS`: comma-separated list of allowed origins for the SPA.

---

## Modals

- Always in `components/ui/modal/`.
- Controlled by local state or React context.
- Never navigate to a route to open a modal.
- Use React Portal to render outside the main tree.

---

## Input Validation — Required at Every API Boundary

Never trust the request body. Validate shape and types before passing to a service.
Use Zod for all validation. Define schemas in the service's `.types.ts` file.

```ts
// modules/feedback/feedback.types.ts
import { z } from 'zod'

export const CreateFormResponseSchema = z.object({
  nomePaciente: z.string().min(2).max(120),
  cpf: z.string().regex(/^\d{11}$/, 'CPF inválido'),
  setor: z.string().min(1),
  respostas: z.record(z.unknown()),
})

export type CreateFormResponseInput = z.infer<typeof CreateFormResponseSchema>
```

```ts
// app/api/feedback/form-responses/route.ts
const parsed = CreateFormResponseSchema.safeParse(await req.json())
if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)
await formResponseService.create(parsed.data)
```

Rules:
- Parse with `.safeParse()`, never `.parse()` (avoids unhandled throws in route.ts).
- Return `badRequest()` with the Zod field errors — never a 500.
- Schemas live next to their types, not inside route.ts.
- Strip unknown fields: Zod does this by default (`.strip()`).

---

## Authorization — Role + Ownership Checks

Authentication (valid JWT) is not the same as authorization (allowed to do this).
Always verify both.

```ts
// modules/auth/auth.guards.ts
export function assertTenant(session: JWTPayload, tenantId: string) {
  if (session.role === 'super_admin') return  // super admin bypasses
  if (session.tenantId !== tenantId) throw new ForbiddenError()
}
```

```ts
// route.ts — before any service call that touches a specific tenant resource
assertTenant(session, params.tenantId)
```

Rules:
- `verifyAuth()` checks the JWT is valid and the role is in the allowed list.
- `assertTenant()` / ownership checks happen after that, inside the route or service.
- `super_admin` bypasses tenant isolation — verify this explicitly, do not assume.
- `viewer` role is read-only: never allow write operations even if JWT is valid.

---

## HTTP Security Headers

Next.js config must set these headers on every response. Already configured in
`next.config.ts`. Do not remove them.

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

For API routes that accept file uploads (e.g. `/api/*/foto`), validate:
- MIME type from the actual file bytes, not the `Content-Type` header.
- Max file size before reading the full stream.

---

## CORS — Explicit Allowlist Only

CORS is configured via `CORS_ORIGINS` env var (comma-separated). Never use `*`.
The middleware or next.config.ts applies these headers; do not add inline CORS
headers in individual route.ts files.

Public routes (no auth required, e.g. form-responses POST) still enforce CORS.
CORS is not a substitute for auth.

---

## Rate Limiting — Protect Public Endpoints

Public routes that accept writes (form submit, login) must enforce rate limiting.
Use the middleware layer — not inside individual route.ts files.

Suggested limits:
- `POST /api/auth/login` — 10 req / minute per IP
- `POST /api/feedback/form-responses` — 5 req / minute per IP

If a rate-limit library is not yet set up, add a TODO comment and open a task rather
than skipping silently.

---

## Sensitive Data — Never Log or Return

- Never log passwords, tokens, CPF, or any PII.
- Log errors with a correlation ID, not with the full request body.
- Prisma query errors may contain raw SQL — catch and discard before returning.
- CPF stored in DB must be validated (11 digits, Luhn check). Consider storing only
  the last 4 digits for display and a hashed version for lookup.

---

## Clean Architecture — Additional Rules

### Services are pure functions over data

Services receive plain arguments (IDs, validated DTOs). They never:
- Read from `req` directly
- Call `NextResponse`
- Import from `app/` or `components/`

### One responsibility per file

A service file handles one domain concept. If a file grows beyond ~150 lines,
split it by sub-concern (`rodada.service.ts` → `rodada-query.service.ts` +
`rodada-command.service.ts`).

### No barrel files (`index.ts`) unless the module has 4+ exports

Barrel files hide real import paths and slow down tree-shaking. Only create
`index.ts` when there are genuinely many public exports from a module.

### Avoid prop drilling beyond 2 levels

If a prop needs to pass through more than 2 component layers, lift it to a
React context or move the logic to a hook. Do not thread the same prop through
intermediate components that don't use it.

### Keep pages thin

Pages (`page.tsx`) should only:
1. Read route params / search params
2. Call one or more hooks
3. Render layout + components

No business logic, no inline data transformations, no direct service calls.

### Co-locate component styles

Tailwind classes belong on the JSX element. Do not extract single-use class
strings into constants. Only extract when the same class combination is reused
in 3+ places.

---

## Prisma — Safe Query Patterns

```ts
// Prefer select over findMany returning full rows
const rodadas = await prisma.rodada.findMany({
  where: { tenantId },
  select: { id: true, status: true, criadoEm: true },  // only what is needed
})

// Use transactions for multi-step writes
const result = await prisma.$transaction(async (tx) => {
  const rodada = await tx.rodada.create({ data: { ... } })
  await tx.ambiente.updateMany({ where: { rodadaId: rodada.id }, data: { ... } })
  return rodada
})

// Soft delete: always filter out deleted records
const itens = await prisma.respostaFormulario.findMany({
  where: { tenantId, deletadoEm: null },
})
```

Rules:
- Always `select` only the fields the caller actually needs.
- Never return password hashes or internal flags to route.ts.
- Use `$transaction` for any operation that must be atomic.
- Always filter `deletadoEm: null` when querying soft-deletable models.
- Never expose Prisma `PrismaClientKnownRequestError` to the client.

---

## TypeScript — Strictness Rules

```ts
// Use discriminated unions for state instead of boolean flags
type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }

// Narrow unknown errors before using them
function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Erro desconhecido'
}

// Prefer readonly for data that should not be mutated
function renderList(items: readonly Item[]) { ... }
```

Rules:
- `tsconfig.json` must keep `"strict": true`. Never disable it.
- No `as any` or `@ts-ignore`. Use `as unknown as T` only with a comment explaining why.
- Prefer `type` over `interface` for union types; use `interface` for object shapes
  that may be extended.
- All async functions must have explicit return types: `Promise<User>`, not inferred.

---

## What NOT to Do

- Do not add `any` types. If you need an escape hatch, use `unknown` + type guard.
- Do not add business logic inside `route.ts` files.
- Do not call `fetch` inside components — use hooks.
- Do not write Prisma queries inside `route.ts` — use services.
- Do not accept `criadoPorId`, `tenantId`, or `role` from request bodies.
- Do not use `prisma db push` for schema changes.
- Do not skip tenant isolation filters.
- Do not expose error details to the client.
- Do not commit `.env` files.
- Do not create new abstractions or utilities for one-off use cases — keep it simple.

---

## Current Project Status (as of 2026-03-19)

See `INTEGRATION_PLAN.md` for full task breakdown. Summary:

- Fase 1 (Schema): complete
- Fase 2 (Architecture foundations: api-response, auth.guards, auth.types): complete
- Fase 3 (Feedback API routes + modules): complete
- Fase 4 (Unified auth + CORS): complete
- Remaining: PM2 config, .env.example update, production build validation, FeedbackForms SPA pointing to new API
