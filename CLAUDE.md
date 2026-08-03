# Sistema Rondas + API Trilogo — Agent Instructions

Multi-tenant platform built with **Next.js 15 (App Router) + Prisma + PostgreSQL**.
Combines LinenSistem (linen/hotelaria + incidents + gas inspection) with FeedbackForms
(patient satisfaction surveys) and Trilogo ERP integration (asset sync).

> **Documentação por módulo:** `docs/README.md` é o índice. Cada `src/modules/*/README.md`,
> os READMEs de camada (`src/lib`, `src/hooks`, `src/services`, `src/components`, `src/utils`),
> `docs/ARQUITETURA.md` e `docs/PERMISSOES.md` foram gerados do código real e registram as
> divergências conhecidas deste arquivo. **Em conflito com os catálogos abaixo (componentes,
> hooks, roles), confie nos READMEs e no código — nunca recrie componentes/fluxos que os
> READMEs marcam como removidos** (ex.: `usePatrimonio`, `FiltrosPatrimonio`, `TicketRow`).
> Antes de mexer num módulo, leia o README dele; ao mudar comportamento, atualize o README junto.

---

## What This System Does

| Module | Description |
|--------|-------------|
| **Ronda de Ocorrências** | Security/incident rounds: operators walk through environments, register incidents with photos |
| **Inspeção de Gases** | Gas inspection rounds: register O2 purity, pressure, supply events, alterations per environment |
| **Hotelaria** | Face recognition-based linen entry/exit: register person → capture face → log movements |
| **Patrimônio** | Trilogo ERP asset sync: search assets by patrimony code, maintenance scheduling, public QR links |
| **FeedbackForms** | Patient satisfaction surveys: form templates, responses, analytics by sector/period |
| **Admin** | Super admin panel: manage tenants, users, view cross-tenant rounds |

---

## Stack

- **Framework:** Next.js 15, App Router, React 19
- **ORM:** Prisma 6 (PostgreSQL)
- **Auth:** JWT via `jose` (cookie `ls_session` + Bearer header), bcryptjs for passwords
- **Styling:** Tailwind CSS 4
- **Validation:** Zod 4 (every API boundary)
- **State/Data:** TanStack Query v5 for server state; `useState` for local UI state
- **Charts:** Recharts
- **Face Recognition:** face-api.js (TensorFlow-based, client-side)
- **Language:** TypeScript strict — `any` is forbidden

---

## Folder Structure & Responsibilities

```
src/
  app/
    [tenantSlug]/          # Tenant-scoped pages (ronda, inspeção, hotelaria, etc.)
    admin/                 # Super-admin pages (tenants, users, rounds dashboard)
    api/                   # API routes — ONLY: auth → service → respond
    bem/[token]/           # Public asset page (no auth, token-based)
    login/                 # Login page
    mudar-senha/           # Password change page
    ocorrencias/           # Incident list/history pages
    page.tsx               # Home with action cards
  components/
    ui/                    # Reusable UI primitives (Button, Card, Input, Text, Header)
    ui/inspecao/           # Inspection-specific cards and lazy photos
    ui/modal/              # All modals (ModalCriarTenant, ModalCriarUsuario, ModalConfirmarReset)
    ui/patrimonio/         # Asset filter controls, maintenance ticket rows
    ui/ronda/              # Incident round cards, environment groups, lazy photos
    camera-view.tsx        # Camera feed for face capture
    face-api-preloader.tsx # Preloads face-api.js models on mount
  hooks/                   # Client state + data fetching — consumed by pages/components
  lib/                     # Server-only utilities (never imported in components/hooks)
  modules/                 # All business logic + Prisma queries (one folder per domain)
  services/                # Client-side fetch wrappers calling /api/* routes
  types/                   # Shared TypeScript interfaces (global, cross-domain)
  utils/                   # Pure utility functions (CPF validation, date formatting)
prisma/
  schema.prisma            # Single source of truth for DB schema
  migrations/              # Never delete. Never mix domains in one migration.
```

### Layer Rules — Never Cross These Boundaries

```
route.ts    → auth check → parse body → call service → return response helper
             NO Prisma, NO business logic, NO direct DB access

modules/    → all Prisma queries + business logic
             NO req/res, NO NextResponse, NO imports from app/ or components/

components/ → props in, events out, NO fetch, NO hooks that hit the network
             Exceptions: camera-view.tsx and face-api-preloader.tsx have WebRTC/ML side effects

hooks/      → useState + calls to services/ — consumed by pages and components
             NO direct fetch, NO Prisma, NO server-only imports

services/   → client fetch wrappers calling /api/* — used only by hooks
             NO business logic, only HTTP calls + response typing

lib/        → server-only utilities (db.ts, auth.ts, api-response.ts)
             NEVER imported in client components or hooks
```

---

## Existing Components Catalog

### `src/components/ui/` — Primitives

| Component | Props / Usage |
|-----------|--------------|
| `Button.tsx` | `variant`, `size`, `loading`, `onClick` — wraps `<button>` with Tailwind variants |
| `Card.tsx` | Generic card wrapper with optional title slot |
| `Input.tsx` | Controlled text input with label and error state |
| `Text.tsx` | Typography: `variant` = `heading-lg`, `heading-md`, `body-md`, `caption` |
| `Header.tsx` | Page top bar with logo + user menu |
| `LogoutButton.tsx` | Calls `POST /api/auth/logout`, redirects to `/login` |
| `MudarSenhaBanner.tsx` | Banner shown when `mustChangePassword === true` in JWT |
| `CheckFeedback.tsx` | Feedback check confirmation UI |

### `src/components/ui/ronda/` — Incident Rounds

| Component | Usage |
|-----------|-------|
| `RondaCard.tsx` | Summary card for one incident round (status, date, environment count) |
| `OcorrenciaCard.tsx` | Card for a single incident inside a round |
| `GrupoAmbientes.tsx` | Groups environments into blocks for the round form |
| `FotoLazy.tsx` | Lazy-loads incident photo (base64) only when visible in viewport |

### `src/components/ui/inspecao/` — Gas Inspection

| Component | Usage |
|-----------|-------|
| `RodadaCard.tsx` | Summary card for one inspection round |
| `AmbienteCard.tsx` | Card for one environment in inspection (O2 purity, pressure, backup status) |
| `GrupoAmbientesInspecao.tsx` | Groups environments by block for inspection form |
| `FotoLazyAmbiente.tsx` | Lazy-loads inspection alteration photo |

### `src/components/ui/modal/` — Modals

| Component | Usage |
|-----------|-------|
| `ModalCriarTenant.tsx` | Form to create a new tenant (super_admin only) |
| `ModalCriarUsuario.tsx` | Form to create a user with role selection |
| `ModalConfirmarReset.tsx` | Confirmation modal before resetting a user password |

All modals: controlled by local `useState`, rendered via React Portal, never navigate to a route.

### `src/components/ui/patrimonio/` — Assets

| Component | Usage |
|-----------|-------|
| `FiltrosPatrimonio.tsx` | Filter bar for asset search (company, project, patrimony code) |
| `TicketRow.tsx` | Single row in maintenance ticket list |

---

## Existing Hooks Catalog

| Hook | Purpose |
|------|---------|
| `useAuth` | Fetches `/api/auth/me`, exposes `user`, `loading`, `logout()` |
| `useLogin` | Login form state: credentials, loading, error, `submit()` |
| `useRonda` | Incident round list + create + finalize operations |
| `useRondaBase` | Shared base logic for both `useRonda` and `useInspecao` (draft save/restore, ambiente navigation) |
| `useInspecao` | Gas inspection round state + per-ambiente data entry |
| `useOcorrenciaRonda` | Incident detail creation and editing within a round |
| `usePatrimonio` | Asset search, maintenance ticket CRUD, Trilogo sync |
| `useAdminTenants` | Tenant CRUD for admin panel |
| `useAdminUsuarios` | User CRUD + password reset for admin panel |

When adding a new domain feature, create a dedicated hook. Do not add domain logic to `useAuth` or generic hooks.

---

## Existing Modules (Server-Side Services)

| Module | Service files | Responsibility |
|--------|--------------|----------------|
| `auth` | `auth.service.ts`, `auth.guards.ts`, `tenant-resolver.ts` | JWT sign/verify, login, verifyAuth guard, assertTenant |
| `rondas` | `rondas.service.ts`, `ronda-draft.service.ts` | Incident round CRUD + JSON draft persistence |
| `rodadas` | `rodadas.service.ts` | Gas inspection round CRUD |
| `ocorrencias` | `ocorrencias.service.ts` | Incident detail creation with photo |
| `ambientes` | `ambientes.service.ts` | Environment list, photo upload |
| `tenants` | `tenants.service.ts` | Tenant CRUD, slug resolution |
| `usuarios` | `usuarios.service.ts` | User CRUD, password hashing, reset |
| `dashboard` | `dashboard.service.ts` | Aggregated stats queries |
| `feedback` | `form-response.service.ts`, `form-template.service.ts`, `analytics.service.ts` | Survey forms + response analytics |
| `pessoas` | `pessoas.service.ts` | Person registration + face descriptor storage |
| `movimentacoes` | `movimentacoes.service.ts` | Entry/exit logs (hotelaria) |
| `face-match` | `face-match.service.ts` | Face descriptor comparison against DB |
| `agendamentos` | `agendamentos.service.ts` | Maintenance schedule from Trilogo |
| `links-publicos` | `links-publicos.service.ts` | Public token generation for asset QR links |

---

## Database Models Summary

### Core

| Model | Key fields |
|-------|-----------|
| `Tenant` | `id`, `slug (unique)`, `nome`, `ativo`, `trilogoCompanyId`, `trilogoProjectName`, `feedbackForms (bool)` |
| `Usuario` | `id`, `email (unique)`, `username (unique)`, `senhaHash`, `role`, `tenantId`, `sistemas[]`, `mustChangePassword` |

### Incident Rounds

| Model | Key fields |
|-------|-----------|
| `RondaOcorrencia` | `id`, `tenantId`, `criadoPorId`, `iniciadoEm`, `finalizadoEm` |
| `RegistroAmbiente` | `id`, `rondaId`, `ambiente`, `tipoRegistro (ocorrencia\|gases)`, `temOcorrencia`, `concluidoEm` |
| `OcorrenciaDetalhe` | `id`, `registroId`, `tipo`, `descricao`, `foto (base64)`, `trilogoChamado`, `bemPatrimony` |
| `RondaDraft` | `id`, `tenantId`, `criadoPorId`, `estado (JSON)`, `atualizadoEm` |

### Gas Inspection

| Model | Key fields |
|-------|-----------|
| `Rodada` | `id`, `tenantId`, `criadoPorId`, `iniciadoEm`, `finalizadoEm` |
| `AmbienteInspecionado` | `id`, `rodadaId`, `ambiente`, `purezaO2`, `pressaoO2`, `pressaoAr`, `backupLigado`, `temAlteracao` |
| `Abastecimento` | `id`, `ambienteInspecionadoId`, `quantidade`, `tamanho` |
| `Alteracao` | `id`, `ambienteInspecionadoId`, `tipo`, `descricao`, `foto (base64)`, `trilogoChamado` |

### Tenant Configuration

| Model | Key fields |
|-------|-----------|
| `BlocoTenant` | `id`, `tenantId`, `nome`, `ordem`, `ativo` |
| `AmbienteTenant` | `id`, `tenantId`, `blocoId`, `nome`, `tipo (ocorrencia\|gases)`, `ativo` |

### Hotelaria / Face

| Model | Key fields |
|-------|-----------|
| `Pessoa` | `id`, `tenantId`, `nome`, `cpf`, `faceDescriptor (JSON — 128-dim array)` |
| `Movimentacao` | `id`, `tenantId`, `pessoaId`, `tipo (retirada\|devolucao)`, `dataHora` |

### Patrimônio / Assets

| Model | Key fields |
|-------|-----------|
| `AgendamentoManutencao` | `id`, `tenantId`, `trilogoAssetId`, `patrimony`, `status (pendente\|realizado\|cancelado)` |
| `LinkPublicoBem` | `id`, `tenantId`, `companyId`, `projeto`, `ambiente` |

### Feedback / Surveys

| Model | Key fields |
|-------|-----------|
| `TemplateFormulario` | `id`, `tenantId`, `nome`, `campos (JSON)`, `ativo` |
| `RespostaFormulario` | `id`, `tenantId`, `templateId`, `nomePaciente`, `cpf`, `setor`, `respostas (JSON)`, `deletadoEm` |

---

## Import Order (always follow)

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
import { Button } from '@/components/ui/Button'

// 5. Types (import type)
import type { JWTPayload } from '@/modules/auth/auth.types'
```

---

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| React component | PascalCase | `OcorrenciaCard.tsx` |
| Hook | camelCase + `use` prefix | `useRondaBase.ts` |
| Server service | kebab-case + `.service.ts` | `rondas.service.ts` |
| Client service | kebab-case + `.service.ts` | `rondas.service.ts` (in `src/services/`) |
| Types file | `.types.ts`, PascalCase interfaces | `rondas.types.ts` |
| API route folder | plural noun | `/api/rondas/`, `/api/rodadas/` |
| DB table (`@@map`) | snake_case plural | `ronda_ocorrencias`, `registros_ambiente` |
| DB column (`@map`) | snake_case | `tenant_id`, `criado_por_id` |

---

## Security Rules — Non-Negotiable

### Authentication on every protected route

```ts
import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, unauthorized } from '@/lib/api-response'

export async function GET(req: Request) {
  const session = await verifyAuth(req, ['tenant_admin', 'operator'])
  if (!session) return unauthorized()
  // proceed
}
```

`verifyAuth()` reads Bearer header or `ls_session` cookie. Always pass the allowed roles array.

### Tenant isolation — mandatory on every Prisma query

```ts
// CORRECT
const rondas = await prisma.rondaOcorrencia.findMany({
  where: { tenantId: session.tenantId }
})

// WRONG — never query multi-tenant tables without tenant filter
const rondas = await prisma.rondaOcorrencia.findMany()
```

`super_admin` has `tenantId: null`. When scoping to a specific tenant, pass an explicit tenantId.
When listing cross-tenant (admin only), skip the filter intentionally with a comment.

### criadoPorId always from the JWT — never from the request body

```ts
// CORRECT
await rondasService.criar(session.tenantId!, session.sub)

// WRONG
const { criadoPorId } = await req.json()  // never trust client-supplied IDs
```

### Never expose internals

- Catch all errors server-side, return `serverError()` to the client.
- Never send Prisma errors, stack traces, raw SQL, or internal model details in responses.
- `senhaHash` must never appear in any service return value or API response.

---

## API Response Shape — Always Use the Helpers

Every `route.ts` must use `lib/api-response.ts`. Never call `NextResponse.json()` directly.

```ts
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
{ data: T, message?: string }   // success
{ error: string, details?: unknown }  // error
```

---

## JWT Payload Contract

```ts
interface JWTPayload {
  sub: string               // userId
  email: string
  nome: string
  role: 'super_admin' | 'tenant_admin' | 'admin_multi' | 'operator' | 'operator_patrimonio' | 'operator_forms' | 'viewer'
  tenantId: string | null   // null = super_admin
  tenantSlug: string | null
  sistemas: string[]        // ['linensistem', 'feedbackforms']
  mustChangePassword?: boolean
  tenantIds?: string[]      // admin_multi/viewer: [tenantId, ...tenantsExtras] resolvido no login
  iat?: number
  exp?: number
}
```

Shared with FeedbackForms SPA. Do not add or rename fields without updating both projects.
JWT expires in 4 hours. Signed with HS256, stored in httpOnly cookie `ls_session`.

---

## Role Access Matrix

**Princípio: papéis administrativos têm as MESMAS telas e rotas; muda apenas o
ALCANCE (quais tenants).** Detalhes completos, helpers de escopo e histórico em
`docs/PERMISSOES.md` — leia antes de mexer em auth/permissões.

| Role | Reads | Writes | Scope |
|------|-------|--------|-------|
| `super_admin` | all | all | cross-tenant |
| `admin_multi` | seus tenants | igual a tenant_admin, por tenant | N tenants (`tenantIds[]`) |
| `tenant_admin` | own tenant | own tenant | single tenant |
| `operator` | own tenant | rondas, inspeção, manutenção | single tenant |
| `operator_patrimonio` | own tenant | assets, maintenance | single tenant |
| `operator_forms` | own tenant | feedback forms | single tenant |
| `viewer` | **alias LEGADO de `admin_multi`** (rename pendente no banco) | idem admin_multi, exceto admin de chamados | N tenants |

Escopo de tenant SEMPRE via helpers de `modules/auth/tenant-filter.ts`
(`escopoLeitura`, `allowedTenantIds`, `canScopeTenant`, `resolveActiveTenantId`)
— nunca reconstruído inline em rotas. Allowlists de rota vêm de constantes
compartilhadas (`*.rules.ts`), consumidas por UI + rota + guard juntas.

---

## Input Validation — Zod at Every API Boundary

```ts
// modules/rondas/rondas.types.ts
import { z } from 'zod'

export const CriarRondaSchema = z.object({
  ambientes: z.array(z.string().uuid()).min(1),
})
export type CriarRondaInput = z.infer<typeof CriarRondaSchema>
```

```ts
// app/api/rondas/route.ts
const parsed = CriarRondaSchema.safeParse(await req.json())
if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)
await rondasService.criar(session.tenantId!, session.sub, parsed.data)
```

Rules:
- Always `.safeParse()`, never `.parse()`.
- Schemas live in `.types.ts` next to the service — never inside `route.ts`.
- Zod strips unknown fields by default — rely on this.
- Return `badRequest()` with field errors, never a 500 for invalid input.

---

## Error Handling Pattern

```ts
// modules/rondas/rondas.service.ts
export async function listar(tenantId: string): Promise<RondaResumo[]> {
  try {
    return await prisma.rondaOcorrencia.findMany({
      where: { tenantId },
      select: { id: true, iniciadoEm: true, finalizadoEm: true },
      orderBy: { iniciadoEm: 'desc' },
    })
  } catch (error) {
    console.error('[rondas.service] listar:', error)
    throw error
  }
}

// app/api/rondas/route.ts
export async function GET(req: Request) {
  const session = await verifyAuth(req, ['tenant_admin', 'operator'])
  if (!session) return unauthorized()
  try {
    const rondas = await rondasService.listar(session.tenantId!)
    return ok(rondas)
  } catch {
    return serverError('listar rondas failed')
  }
}
```

---

## Audit Fields — Required on User-Action Models

| Situation | Required fields |
|-----------|----------------|
| Any creation by authenticated user | `criadoPorId String` + `criadoEm DateTime @default(now())` |
| Mutable model | + `atualizadoEm DateTime @updatedAt` + `atualizadoPorId String?` |
| Logical deletion | + `deletadoEm DateTime?` |
| Public operation (no auth) | `criadoPorId String?` (nullable) |

---

## Database Conventions

- Primary key: `id String @id @default(uuid())`
- Every model with `tenantId` must have at minimum `@@index([tenantId])`
- Add compound indexes for frequent patterns: `@@index([tenantId, criadoEm])`
- One migration per feature domain — never mix unrelated models
- Never `prisma db push` in production — always `prisma migrate deploy`
- Never delete migration files

---

## Draft / Auto-Recovery Pattern

Incident rounds and inspection rounds support mid-session recovery via `RondaDraft`:

```ts
// Save draft (called on each environment completion)
await rondaDraftService.salvar(tenantId, userId, estadoJSON)

// Load draft on page mount
const draft = await rondaDraftService.carregar(tenantId, userId)

// Clear draft on finalization
await rondaDraftService.limpar(tenantId, userId)
```

The hook `useRondaBase` handles draft save/load lifecycle. Both `useRonda` and `useInspecao` extend it.

---

## Photo / File Handling

Photos are stored as base64 strings directly in PostgreSQL text fields (`foto` column).

Rules:
- Validate max size before decoding: Zod schema `z.string().max(2_000_000)` (~1.5MB)
- Validate MIME type from actual bytes, not the `Content-Type` header
- Lazy-load photos with `FotoLazy.tsx` or `FotoLazyAmbiente.tsx` (IntersectionObserver)
- Never store file paths — always base64 in the DB for this system

---

## Trilogo ERP Integration

Trilogo is an external asset management ERP. Integration points:

- `Tenant.trilogoCompanyId` and `trilogoProjectName` configure which Trilogo project to sync
- `AgendamentoManutencao.trilogoAssetId` links a maintenance ticket to a Trilogo asset
- `OcorrenciaDetalhe.trilogoChamado` flags an incident as sent to Trilogo
- Cron sync: `POST /api/cron/sync-trilogo` — syncs assets from Trilogo API
- Public QR links (`LinkPublicoBem`) allow scanning without auth, resolving to asset info

---

## Face Recognition Pattern

Face recognition is client-side only (face-api.js). The flow:

1. `face-api-preloader.tsx` loads TensorFlow models on mount
2. `camera-view.tsx` captures video feed and extracts 128-dim face descriptor
3. Descriptor sent to `POST /api/hotelaria/[tenantSlug]/verificar-face`
4. Server compares against stored descriptors in `Pessoa.faceDescriptor` via Euclidean distance
5. `face-match.service.ts` handles comparison — threshold configurable

Face descriptors are 128-dimensional float arrays stored as JSON. Never store raw face images.

---

## Modals

- All modals live in `src/components/ui/modal/`
- Controlled by local `useState` or React context — never route-based
- Use React Portal to render outside the main tree
- Never navigate to a separate route to open a modal

---

## HTTP Security Headers

Configured in `next.config.ts` — do not remove:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## CORS

Configured via `CORS_ORIGINS` env var (comma-separated). Never use `*`.
Applied in middleware/next.config.ts — never inline in individual route files.
FeedbackForms SPA origin must be in `CORS_ORIGINS`.

---

## Rate Limiting

Public write endpoints must be rate-limited in the middleware layer:

- `POST /api/auth/login` — 10 req/min per IP
- `POST /api/feedback/form-responses` — 5 req/min per IP

If not yet set up: add a `// TODO: add rate limiting` comment and open a task.

---

## Environment Variables

- Server-only: no prefix
- Client-exposed: `NEXT_PUBLIC_` prefix
- Never hardcode secrets. Never commit `.env` or `.env.production`
- `JWT_SECRET` must be identical in LinenSistem and FeedbackForms
- `CORS_ORIGINS`: comma-separated allowed origins

---

## Clean Architecture — Additional Rules

### Services are pure over data

Services receive plain arguments (IDs, validated DTOs). They never:
- Read from `req`
- Call `NextResponse`
- Import from `app/` or `components/`

### One responsibility per file

Split when a service file exceeds ~150 lines:
`rondas.service.ts` → `rondas-query.service.ts` + `rondas-command.service.ts`

### Avoid prop drilling beyond 2 levels

Lift to React context or move to a hook.

### Keep pages thin

`page.tsx` should only: read params → call hooks → render components.
No business logic, no inline transforms, no direct service calls.

### Co-locate styles

Tailwind on the JSX element. Only extract when the same combination appears in 3+ places.

### No barrel files unless 4+ exports

Barrel files hide import paths. Create `index.ts` only when a module genuinely has many public exports.

---

## Prisma — Safe Query Patterns

```ts
// Select only needed fields
const rondas = await prisma.rondaOcorrencia.findMany({
  where: { tenantId },
  select: { id: true, iniciadoEm: true, finalizadoEm: true },
})

// Atomic multi-step writes
const result = await prisma.$transaction(async (tx) => {
  const ronda = await tx.rondaOcorrencia.create({ data: { ... } })
  await tx.registroAmbiente.createMany({ data: ambientes.map(a => ({ rondaId: ronda.id, ...a })) })
  return ronda
})

// Soft delete — always filter
const respostas = await prisma.respostaFormulario.findMany({
  where: { tenantId, deletadoEm: null },
})
```

Rules:
- Always `select` only what the caller needs
- Never return `senhaHash` or internal flags
- Use `$transaction` for atomic operations
- Always filter `deletadoEm: null` on soft-deletable models
- Never expose `PrismaClientKnownRequestError` to the client

---

## TypeScript — Strictness Rules

```ts
// Discriminated unions for state — never boolean flag soup
type RondaState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: RondaResumo[] }
  | { status: 'error'; message: string }

// Narrow unknown errors
function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Erro desconhecido'
}
```

Rules:
- `"strict": true` in tsconfig — never disable
- No `as any` or `@ts-ignore`
- `type` for unions; `interface` for extensible object shapes
- All async functions must have explicit return types

---

## Sensitive Data — Never Log or Return

- Never log passwords, tokens, CPF, or any PII
- Log errors with context label `[module.service] functionName:` — never the full request body
- Prisma errors may contain raw SQL — always catch before returning to client
- CPF: validate 11 digits + Luhn check; consider storing only last 4 digits for display

---

## What NOT to Do

- No `any` types — use `unknown` + type guard
- No business logic in `route.ts`
- No `fetch` inside components — use hooks
- No Prisma queries in `route.ts` — use services
- No `criadoPorId`, `tenantId`, or `role` from request bodies
- No `prisma db push` for schema changes
- No skipping tenant isolation filters
- No exposing error details to the client
- No committing `.env` files
- No new abstractions for one-off cases — keep it simple
- No `NextResponse.json()` in routes — always use `lib/api-response.ts` helpers
