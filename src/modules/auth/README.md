# Módulo `auth`

> Guards de autenticação/autorização via JWT (cookie `ls_session` ou Bearer), helpers de escopo multi-tenant e resolução de tenant.

Modelo conceitual de permissões: **`docs/PERMISSOES.md`** (fonte de verdade — leia antes de mexer em papéis ou escopo).

## Responsabilidade

Valida o JWT em toda rota protegida e devolve o payload tipado (`JWTPayload`) com filtro de roles. Centraliza TODA a decisão de escopo de tenant em `tenant-filter.ts` (`escopoLeitura`, `filtroEscopo`, `allowedTenantIds`, `canScopeTenant`, `resolveActiveTenantId`) — regra de ouro: nunca reconstruir escopo inline nas rotas. A criptografia (jose/bcryptjs) e o cookie ficam em `src/lib/auth.ts`; este módulo consome `verifyToken` de lá.

## Arquivos

| Arquivo | Papel |
|---------|-------|
| `auth.guards.ts` | `verifyAuth`, `verifyAuthDetailed`, `assertSistema` — extração/validação do token + checagem de role |
| `auth.types.ts` | `JWTPayload`, `LINENSISTEM_ROLES`, `ADMIN_ROLES` |
| `tenant-filter.ts` | Todos os helpers de escopo de tenant (leitura agregada, unidade ativa, validação de acesso) |
| `tenant-filter.test.ts` | Testes vitest de `escopoLeitura`/`filtroEscopo` — garantem que escopo sem unidade FECHA o filtro |
| `tenant-resolver.ts` | `resolveTenantId` — resolve tenantId por `tenantSlug` em query param (rotas do FeedbackForms SPA) |

Não existe `auth.service.ts` (divergência do CLAUDE.md) — login/logout vivem nas rotas `api/auth/*`, apoiadas em `src/lib/auth.ts` (`signToken`, `verifyToken`, `setSessionCookie`, `clearSessionCookie`, `hashPassword`, `comparePassword`).

## Funções públicas

| Função | Assinatura | Descrição |
|--------|-----------|-----------|
| `verifyAuth` | `(req: Request, allowedRoles?: AllowedRole[]) => Promise<JWTPayload \| null>` | Lê `Authorization: Bearer` ou cookie `ls_session`, valida e filtra por roles. `null` tanto para não autenticado quanto role negado |
| `verifyAuthDetailed` | `(req: Request, allowedRoles?: AllowedRole[]) => Promise<AuthResult>` | Distingue `{ ok: false, reason: 'unauthenticated' \| 'forbidden' }` de `{ ok: true, session }` |
| `assertSistema` | `(session: JWTPayload, sistema: 'feedbackforms' \| 'linensistem') => void` | Lança `Error` se o sistema não está em `sistemas[]`. `super_admin` e tokens sem `sistemas[]` passam |
| `tenantFilter` | `(session) => where` | `{ tenantId: { in: tenantIds } }` se `tenantIds.length > 0`; senão `{ tenantId }` ou `{}` |
| `escopoSessao` | `(session) => { tenantId: string \| null; tenantIds?: string[] }` | `super_admin` → `tenantId: null` (cross-tenant); demais → o próprio tenant |
| `escopoLeitura` | `(session) => EscopoLeitura` | `{ global: true }` para super_admin; senão `{ global: false, tenantIds }` (união deduplicada de `tenantId` + `tenantIds`). Desfaz a ambiguidade do `null` |
| `filtroEscopo` | `(escopo: EscopoLeitura) => where` | Global → `{}`; 1 unidade → igualdade; N → `in`; **zero unidades → `{ tenantId: { in: [] } }` (fecha, nunca where vazio)** |
| `allowedTenantIds` | `(session) => string[]` | Lista de unidades acessíveis: `tenantIds` (admin_multi/viewer) ou `[tenantId]`; super_admin sem tenant → `[]` |
| `canScopeTenant` | `(session, tenantId: string) => boolean` | super_admin sempre; demais precisam do tenant em `allowedTenantIds` |
| `resolveActiveTenantId` | `(session, req: Request) => string \| null` | "Unidade ativa" das rotas `/me/*`: usa header `x-tenant-id` **somente se `canScopeTenant` aprovar**; fallback no `tenantId` primário |
| `resolveTenantId` | `(session: JWTPayload, tenantSlugParam?: string \| null) => Promise<string \| null>` | Query param `tenantSlug` → id via Prisma (`prismaAuth`). Não confundir com `resolveActiveTenantId` |

## Contrato JWTPayload

```ts
interface JWTPayload {
  sub: string          // userId
  email: string
  nome: string
  role: 'super_admin' | 'tenant_admin' | 'admin_multi' | 'operator'
      | 'operator_patrimonio' | 'operator_forms' | 'viewer'
  tenantId: string | null   // null = super_admin
  tenantSlug: string | null
  sistemas: string[]        // ['linensistem', 'feedbackforms']
  mustChangePassword?: boolean
  tenantIds?: string[]      // admin_multi/viewer: [tenantId, ...tenantsExtras], montado no login
  iat?: number
  exp?: number
}
```

- **Roles reais**: os 7 do union acima. `admin_multi` = admin multi-unidade; **`viewer` é o nome LEGADO de `admin_multi`** (o rename ocorreu no repo linensistem; usuários antigos no banco de auth ainda carregam `viewer`) — tratados como equivalentes até a migração do banco (SQL em `docs/PERMISSOES.md` §5).
- Constantes: `LINENSISTEM_ROLES` (sem `operator_forms`) e `ADMIN_ROLES = ['super_admin', 'tenant_admin', 'admin_multi', 'viewer']` (acesso ao painel /admin — mesmas telas, alcance diferente).
- Roles órfãos: `manutencao_admin`/`manutencao_user` aparecem em middleware/layout mas **não** estão no union — `verifyAuth` os rejeita (PERMISSOES.md §7).
- Token HS256, `JWT_SECRET` (mín. 32 chars), expira em **4h**, cookie httpOnly `ls_session` (`sameSite: lax`). Mudança de escopo (`tenantsExtras`) só vale no próximo login.

## Modelos de banco

Sem modelos próprios. `resolveTenantId` lê `Tenant` (`@@map("tenants")`) via `prismaAuth` — alias do Prisma principal em `src/lib/db-auth.ts`, que também exporta `authPool` (pool `pg` cru para `AUTH_DATABASE_URL`, usado por login e módulo `usuarios`).

## Rotas de API que usam este módulo

Praticamente toda rota protegida importa `verifyAuth`/`verifyAuthDetailed`. Domínio auth:

| Método + caminho | Roles permitidos | O que faz |
|------------------|------------------|-----------|
| `POST /api/auth/login` | público | Autentica por `username`/`login`/`email` + `senha`/`password` (SQL cru no `authPool`); monta `tenantIds` de `tenantsExtras`; emite cookie + `accessToken`; upsert do usuário no DB linensistem |
| `POST /api/auth/logout` | público | `clearSessionCookie()` |
| `GET /api/auth/me` | todos os 7 roles | Retorna o `JWTPayload` da sessão |
| `POST /api/me/password` | qualquer autenticado (sem lista de roles) | Troca senha (mín. 6 chars, sem Zod) e reemite o cookie **reconstruindo `tenantIds`** (sem isso o admin_multi perdia as unidades extras ao trocar a senha) |

Uso dos helpers de escopo: `resolveActiveTenantId` em `me/tenant` (e rotas de unidade ativa); `allowedTenantIds` em `me/tenants`, `admin/tenants`, `admin/usuarios/*`; `escopoSessao`/`tenantFilter` nas rotas e services de `chamados`, `manutencoes`, `rondas`, `rodadas`, `dashboard`; `resolveTenantId` + `assertSistema` nas rotas `feedback/*` e `agendamentos`.

## Consumo no client

- `src/services/auth.service.ts` — `login()`, `logout()`.
- `src/hooks/useAuth.ts` — busca `/api/auth/me` (fetch direto), expõe `user`, `isSuperAdmin`, `isAdminMulti` (true para `admin_multi` OU `viewer`), `isViewer`, `logout()`.
- `src/hooks/useLogin.ts` — usa `login()`, redireciona por `role`/`mustChangePassword`/`tenantSlug`.
- `src/services/api.ts` envia o header `x-tenant-id` (unidade ativa em sessionStorage, via `services/active-tenant.ts`, derivada do slug da URL) — consumido no servidor por `resolveActiveTenantId`.

## Padrões aplicados

- **Guard padrão**: `const session = await verifyAuth(req, [...ADMIN_ROLES]); if (!session) return forbidden()`.
- **Escopo centralizado**: rotas de agregação usam `escopoLeitura`/`allowedTenantIds`; rotas de unidade ativa usam `resolveActiveTenantId`. Nunca inline (a duplicação inline foi a causa histórica de vazamento cross-tenant — PERMISSOES.md §8).
- **Senha**: `hashPassword`/`comparePassword` (bcryptjs, cost 10) em `lib/auth.ts`.
- **Helpers de resposta** (`lib/api-response.ts`) em `auth/me` e `me/password`; **login e logout usam `NextResponse.json` direto** (divergência).
- **Testes**: `tenant-filter.test.ts` (vitest) trava a regra "escopo sem unidade fecha o filtro".

## Observações e cuidados

- **Divergências do CLAUDE.md**: não há `auth.service.ts`; login concentra SQL + Prisma + lógica na rota; o union de roles do CLAUDE.md está desatualizado (falta `admin_multi` e `tenantIds`); `viewer` não é read-only (é alias de admin_multi, com escrita escopada).
- **Contrato compartilhado com FeedbackForms**: aliases `login`/`password` no body; `sub` + `userId` duplicados; `JWT_SECRET` idêntico nos dois projetos; não renomear/remover campos do payload sem atualizar ambos. Lá, `admin_multi` degrada com segurança para leitura (`ROLE_MAP`).
- `verifyAuth` retorna `null` genérico — muitas rotas respondem `forbidden()` mesmo sem sessão; use `verifyAuthDetailed` quando o status HTTP importa.
- O cast `session.role as JWTPayload['role']` em `auth.guards.ts` aceita qualquer string do banco — papel fora do union passa pelo compilador mas é rejeitado pelas allowlists.
- `assertSistema` deixa passar tokens sem `sistemas[]` — não usar como única barreira.
- `senhaHash` só transita em login/troca de senha; nunca entra no JWT nem em resposta.
