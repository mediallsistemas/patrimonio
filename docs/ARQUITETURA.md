# Arquitetura e Padrões — Sistema Rondas + API Trilogo

> Documento de referência da arquitetura em camadas e dos padrões transversais.
> Complementa: `docs/PERMISSOES.md` (papéis e escopo multi-tenant),
> `src/lib/README.md`, `src/hooks/README.md`, `src/services/README.md`,
> `src/components/README.md` e os READMEs de `src/modules/*`.

---

## 1. Visão geral

Plataforma multi-tenant (Next.js 15 App Router + React 19 + Prisma 6 +
PostgreSQL) que reúne operação predial/hospitalar: rondas de ocorrências,
inspeção de gases medicinais, chamados de manutenção (incluindo importação de
tickets do ERP Trilogo), manutenções executadas, hotelaria com reconhecimento
facial e pesquisas de satisfação (FeedbackForms, SPA separada que compartilha o
JWT e o banco de autenticação). Auth via JWT `jose` em cookie httpOnly
`ls_session`; validação Zod em toda borda de API; TypeScript strict.

| Módulo | Descrição |
|--------|-----------|
| Ronda de Ocorrências | Operador percorre ambientes por bloco e registra ocorrências com foto; draft com auto-recuperação |
| Inspeção de Gases | Pureza/pressão de O2 e ar, backup, abastecimento e alterações por ambiente |
| Chamados | Abertura, atribuição, execução e finalização de chamados de manutenção; dados fiscais (admin); sync de tickets Trilogo |
| Manutenções | Fluxo iniciar → finalizar com foto antes/depois (elétrica, hidráulica, patrimônio) |
| Patrimônio / Trilogo | Busca de bens por patrimony, agendamentos, links públicos com QR |
| Hotelaria | Entrada/saída de enxoval com reconhecimento facial (face-api.js, client-side) |
| FeedbackForms | Templates e respostas de pesquisas de satisfação + analytics |
| Admin | Painel administrativo cross-tenant: tenants, usuários, rondas, manutenções, chamados, dashboard |

---

## 2. Camadas

```
┌────────────────────────────────── CLIENTE ───────────────────────────────────┐
│  page.tsx (App Router)                                                       │
│    └─► hooks/ (useChamados, useRondaBase…)  ← estado: useState ou TanStack   │
│          └─► services/ (client fetch wrappers)                               │
│                └─► services/api.ts  — fetch /api/*, credentials: 'include',  │
│                    header x-tenant-id, lança ApiError                        │
└───────────────────────────────────┬──────────────────────────────────────────┘
                                    │ HTTP (cookie ls_session)
┌───────────────────────────────────▼───────────────────────── SERVIDOR ───────┐
│  middleware.ts — CORS, rate limit, redirects por role, jwtVerify de páginas  │
│    └─► app/api/**/route.ts — verifyAuth → Zod safeParse → service → helper   │
│          └─► modules/<dominio>/*.service.ts — regra de negócio + Prisma      │
│                └─► lib/db.ts (prisma) / lib/db-auth.ts (authPool)            │
│                      └─► PostgreSQL (app) / PostgreSQL auth (usuarios)       │
└──────────────────────────────────────────────────────────────────────────────┘
```

Regras de fronteira (não cruzar):

- `route.ts`: só auth → parse → service → helper de resposta. Sem Prisma, sem
  regra de negócio.
- `modules/`: toda query Prisma e regra de negócio. Sem `req`/`res`, sem
  `NextResponse`, sem imports de `app/` ou `components/`. Regras puras separadas
  em `*.rules.ts` (testáveis sem I/O — ver `chamados.rules.ts`).
- `components/`: props in, events out; sem fetch (exceções: `camera-view`,
  `face-api-preloader`, `ActiveTenantSync`, `FotoLazy*`).
- `hooks/`: estado + chamadas a `services/`; sem fetch cru (exceção: `useAuth`),
  sem imports server-only.
- `services/`: só HTTP + tipos de resposta.
- `lib/`: infra. Maioria server-only; `error-message`, `ronda-tipos` e
  `rondas-admin-utils` são client-safe (ver `src/lib/README.md`).

---

## 3. Fluxo de uma request autenticada (passo a passo)

Exemplo real: `POST /api/chamados`.

**1. Middleware** (`src/middleware.ts`) — responde preflight OPTIONS, aplica
rate limit nas rotas públicas e deixa `/api/*` passar (a proteção fina é na
rota):

```ts
// ── /api/* — deixa passar (APIs protegem internamente via verifyAuth) ──────
if (pathname.startsWith('/api/')) {
  return applyCors(req, NextResponse.next())
}
```

**2. Autenticação na rota** (`app/api/chamados/route.ts`) — `verifyAuthDetailed`
lê Bearer ou cookie e valida o role contra a lista permitida:

```ts
const auth = await verifyAuthDetailed(req, ROLES_ESCRITA_CHAMADOS)
if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()
const session = auth.session
if (!session.tenantId) return forbidden()
```

**3. Validação Zod** — `safeParse`, nunca `parse`; erro vira 400 com field errors:

```ts
const parsed = CriarChamadoSchema.safeParse(await req.json())
if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)
```

**4. Service** — recebe IDs da sessão (nunca do body) e o DTO validado:

```ts
const chamado = await chamadosCommand.criar(session.tenantId, session.sub, parsed.data, atribuicao)
return created(chamado)
```

**5. Resposta** — helpers de `lib/api-response.ts`; exceções viram
`serverError('criar chamado failed')` sem vazar detalhes.

---

## 4. Padrões transversais

### a) Autenticação JWT

- Assinatura HS256 via `jose`, segredo `JWT_SECRET` (mínimo 32 chars, validado
  no load), expiração **4h**. Cookie httpOnly `ls_session` (`sameSite: lax`,
  `secure` em produção) — setado por `lib/auth.ts#setSessionCookie`.
- `verifyAuth(req, allowedRoles?)` / `verifyAuthDetailed` em
  `modules/auth/auth.guards.ts` aceitam **Bearer header ou cookie** (o Bearer é
  usado pela SPA FeedbackForms).
- Payload (`modules/auth/auth.types.ts`):

```ts
role: 'super_admin' | 'tenant_admin' | 'admin_multi' | 'operator'
    | 'operator_patrimonio' | 'operator_forms' | 'viewer'
tenantId: string | null      // null = super_admin
tenantIds?: string[]         // admin_multi/viewer: [tenantId, ...tenantsExtras]
sistemas: string[]           // ['linensistem', 'feedbackforms']
```

- **Roles reais** (o CLAUDE.md está desatualizado aqui):
  - `admin_multi` — admin multi-unidade; administra os tenants de `tenantIds`.
  - `viewer` — **alias LEGADO de `admin_multi`** (rename pendente no banco de
    auth); tratados como equivalentes em todo o código.
  - `manutencao_admin` / `manutencao_user` — aparecem em `middleware.ts`
    (`MANUTENCAO_ROLES`) e nos labels de `app/admin/usuarios/page.tsx`, mas
    **não estão na union `JWTPayload['role']`** — roles órfãos herdados de outro
    sistema (ver `docs/PERMISSOES.md` §7).
- O login (`api/auth/login`) consulta o **banco de auth separado**
  (`AUTH_DATABASE_URL`, pool `pg` cru em `lib/db-auth.ts`) e monta `tenantIds`
  a partir da coluna `tenantsExtras`. Divergência de padrão: essa rota usa
  `NextResponse.json` direto e SQL cru, não os helpers/Prisma.

### b) Isolamento multi-tenant

Toda query em tabela multi-tenant filtra por tenant. O escopo vive em **um único
lugar** — `modules/auth/tenant-filter.ts` (nunca reconstruir inline):

```ts
tenantFilter(session)        // where direto: {tenantId} | {tenantId:{in: ids}} | {}
escopoSessao(session)        // super_admin → tenantId null (cross-tenant)
escopoLeitura(session)       // {global:true} | {global:false, tenantIds} — "sem unidade" fecha
filtroEscopo(escopo)         // converte escopo em where Prisma
allowedTenantIds(session)    // lista de unidades acessíveis
canScopeTenant(session, id)  // valida acesso a UM tenant
resolveActiveTenantId(session, req) // honra header x-tenant-id se permitido
```

- Admin multi-unidade: o cliente envia o header `x-tenant-id` (unidade ativa,
  derivada do slug da URL — `services/active-tenant.ts` +
  `components/ActiveTenantSync.tsx`); o servidor só aceita se
  `canScopeTenant` passar.
- `resolveTenantId` (`tenant-resolver.ts`) resolve tenant por **slug em query
  param** — usado pelas rotas do FeedbackForms SPA; não confundir com o header.
- `criadoPorId`/`tenantId` **sempre da sessão**, nunca do body.
- Detalhes, histórico de bugs e checklist: `docs/PERMISSOES.md`.

### c) Validação Zod nas bordas

Schemas vivem em `modules/<dominio>/<dominio>.types.ts`, nunca em `route.ts`.
Sempre `safeParse`; input inválido → `badRequest(fieldErrors)`, nunca 500.
Exemplo real (`chamados.types.ts`):

```ts
const fotoBase64 = z.string().min(20, 'Foto inválida').max(2_000_000, 'Foto excede o tamanho máximo')

export const CriarChamadoSchema = z.object({
  titulo: z.string().trim().min(3).max(200),
  tipo: z.enum(TIPOS_CHAMADO),
  prazo: z.coerce.date({ error: 'Informe o prazo' }),
  ambienteId: z.string().uuid('Selecione o ambiente'),
  ...
}).refine(/* patrimony e trilogoAssetId andam juntos */)
```

### d) Formato de resposta `{data}` / `{error}`

Helpers de `lib/api-response.ts` (`ok`, `created`, `noContent`, `badRequest`,
`conflict`, `unauthorized`, `forbidden`, `notFound`, `serverError`). Contrato:
sucesso `{ data, message? }`, erro `{ error }`. No cliente, `services/api.ts`
lança `ApiError(status, message)` para respostas não-2xx e cada service
desembrulha `data`.

### e) Tratamento de erro com log rotulado

```ts
// modules/rondas/ronda-draft.service.ts
} catch (error) {
  console.error('[ronda-draft.service] buscarDraft:', error)
  throw error
}
```

Service loga `[modulo.service] funcao:` e relança; a rota captura e devolve
`serverError('<acao> failed')` — nunca stack trace, SQL ou erro do Prisma para o
cliente. No cliente, `toUserMessage(error)` (`lib/error-message.ts`) converte o
status em mensagem pt-BR para toasts.

### f) Rate limiting (middleware, em memória)

Regras reais em `src/middleware.ts` (janela de 60s por IP+rota):

| Rota | Limite |
|------|--------|
| `POST/GET /api/auth/login` | 20/min *(CLAUDE.md diz 10/min — o código usa 20)* |
| `/api/feedback/form-responses` | 5/min |
| `/api/public/bens` | 30/min |
| `/api/hotelaria/*` | 20/min |

Implementação: `Map` em memória com cleanup a cada 500 chamadas. **Limitação
documentada no próprio código:** funciona por instância de processo — suficiente
para PM2 single-process; com múltiplas instâncias (ou serverless/Vercel, onde
cada lambda tem sua própria memória) seria preciso Redis. IP do cliente extraído
de `x-forwarded-for` apenas atrás de proxy confiável (`TRUSTED_PROXIES`).
Excedeu → `429 { error: 'Muitas tentativas. Aguarde um momento.' }`.

### g) CORS

`CORS_ORIGINS` (env, lista separada por vírgula — nunca `*`). O middleware
responde preflight `OPTIONS` com 204 e só seta `Access-Control-Allow-Origin`
quando a origin está na whitelist, sempre com `Allow-Credentials: true` (a SPA
FeedbackForms depende disso). Headers de segurança (nosniff, X-Frame-Options,
Permissions-Policy, CSP com `frame-ancestors 'none'`) ficam em `next.config.ts`.

### h) Fotos base64 + lazy loading

Fotos são armazenadas como data URL base64 em colunas text do Postgres (nunca
paths de arquivo). Pipeline:

1. Cliente comprime antes de enviar: `utils/foto.ts#arquivoParaBase64Comprimido`
   (máx. 1280px, JPEG 0.7) — mesmo algoritmo inline em `useRondaBase.handleFoto`.
2. Zod limita a `~2_000_000` chars (~1.5MB) na borda.
3. Listagens **nunca retornam a foto** — endpoints dedicados
   (`ocorrencias/{id}/foto`, `chamados/{id}/foto`, `ambientes/{id}/foto`)
   consumidos pelos componentes `FotoLazy`, `FotoLazyAmbiente`,
   `FotoLazyChamado` via IntersectionObserver.
4. Ampliação num único modal global: `ui/FotoLightbox.tsx`.

### i) Draft / auto-recuperação de rondas

`RondaDraft` único por `(tenantId, criadoPorId)`. `useRondaBase` salva o estado
com debounce em `PUT /api/rondas/draft` a cada mutação; no mount, `GET` devolve
o draft e mostra banner retomar/descartar. O service
(`modules/rondas/ronda-draft.service.ts`) expira rondas abertas há >24h antes de
devolver o draft e apaga drafts de rondas já finalizadas. 404/409 durante a
ronda → toast "ronda expirou" + reset. Detalhes: `src/hooks/README.md`.

### j) Soft delete

`RespostaFormulario.deletadoEm` — toda leitura filtra `deletadoEm: null`; o
delete é um `update` que carimba a data. Modelos dos demais domínios usam
delete físico ou status (`cancelado`, `finalizadoEm`).

### k) Integração Trilogo (visão geral)

- `Tenant.trilogoCompanyId` + `trilogoProjectName` configuram o vínculo.
- **Recorte por unidade:** `modules/trilogo/escopo.ts` — a instância Trilogo é
  compartilhada entre hospitais; a mesma regra (match por projeto/endereço do
  departamento) decide de quem é um ticket importado e o que um usuário pode ver.
  Centralizado porque divergência aqui = vazamento cross-tenant.
- **Cron** `GET|POST /api/cron/sync-trilogo`: sincroniza blocos/ambientes de
  todos os tenants com `trilogoCompanyId` (auth: header da Vercel Cron ou
  `Authorization: Bearer CRON_SECRET` com `timingSafeEqual`); invalida
  `lib/blocos-cache.ts`.
- **Tickets → chamados:** `modules/chamados/chamados-sync.service.ts` +
  `chamados-trilogo.ts` importam tickets como chamados (`trilogoTicketId`,
  `trilogoStatusOrigem` no `ChamadoResumo`).
- Bens: busca por patrimony (`me/bens/buscar`), agendamentos de manutenção e
  links públicos com QR (`/bem/[token]`, sem auth).

### l) Nomenclatura e ordem de imports (resumo do CLAUDE.md)

- Componentes PascalCase; hooks `useX.ts`; services kebab-case `.service.ts`;
  schemas/tipos em `.types.ts`; regras puras em `.rules.ts`; rotas de API em
  pastas plurais; tabelas `@@map` snake_case plural, colunas `@map` snake_case.
- Ordem de imports: 1. React/Next → 2. libs externas → 3. `@/lib`, `@/modules`,
  `@/utils` → 4. componentes → 5. `import type`.
- `any` proibido (usar `unknown` + type guard); services com retorno explícito;
  unions discriminadas para estado.

---

## 5. Mapa de rotas de API (`src/app/api/`)

| Pasta | Responsabilidade |
|-------|------------------|
| `admin/` | Painel administrativo: `tenants` (+`[id]/sync-trilogo`), `usuarios` (+reset-password), `rondas`, `manutencoes`, `chamados`, `blocos?tenantId=`, `dashboard` — escopo via `escopoLeitura`/`filtroEscopo` |
| `agendamentos/` | Agendamentos de manutenção de bens (lista, `[id]`) |
| `ambientes/[id]/` | Foto de ambiente inspecionado |
| `auth/` | `login` (banco de auth via pool pg), `logout`, `me` |
| `bens/` | Busca de bens Trilogo: por patrimônio, por empresa, agendamentos públicos, geração de link público |
| `chamados/` | CRUD + ações: `[id]/assumir`, `atribuir`, `finalizar`, `cancelar`, `foto`; `dashboard` gerencial |
| `cron/sync-trilogo/` | Sincronização de blocos/ambientes a partir do Trilogo (secret/Vercel Cron) |
| `dashboard/` | Métricas de movimentações (hotelaria) do tenant |
| `debug/tenants/` | Diagnóstico (interno) |
| `feedback/` | `form-templates`, `form-responses` (público, rate-limited), `analytics` |
| `hotelaria/[tenantSlug]/` | Endpoints públicos de biometria (verificar-face etc.) — rate-limited |
| `manutencoes/` | `historico`, `realizadas` (+`[id]`) — leitura de manutenções concluídas |
| `me/` | Recursos do usuário/unidade ativa: `blocos` (cacheado), `bens/buscar`, `manutencoes` (+`[id]/finalizar`), `password`, `tenant`, `tenants` |
| `movimentacoes/` | Registros de retirada/devolução (hotelaria) |
| `ocorrencias/[id]/` | Foto de ocorrência (lazy) |
| `pessoas/` | Cadastro de pessoas + descritor facial |
| `public/bens/` | Consulta pública de bem por token (QR) — rate-limited |
| `rodadas/` | Inspeção de gases: criar/finalizar rodada, registrar ambientes |
| `rondas/` | Rondas: criar/finalizar, `[id]/ambientes`, `draft` (GET/PUT/DELETE), `bens-tenant`, `expirar` (cron via `x-cron-secret`) |
| `tenant/usuarios/` | Usuários do próprio tenant |
| `tenants/` | Resolução por slug, `[slug]/ambientes` |
| `trilogo/` | Proxy da API Trilogo: tickets por período, `assets` (empresas/projetos/bens) |

---

## 6. Testes

**Unitários/integração — Vitest** (`vitest.config.ts`: environment node,
include `src/**/*.test.ts`, alias `@` → `src`):

- `src/modules/chamados/` — `chamados.rules`, `chamados.types`,
  `chamados-command.service`, `chamados-query.service`, `chamados-sync.service`,
  `chamados-trilogo` (a suíte mais completa do repo).
- `src/modules/manutencoes/` — `manutencoes.rules`, `manutencoes.service`.
- `src/modules/auth/tenant-filter.test.ts` — escopo multi-tenant.
- `src/modules/trilogo/escopo.test.ts` — recorte por unidade dos dados Trilogo.
- `src/app/api/cron/sync-trilogo/route.test.ts` — autenticação/agregação do cron.
- `src/app/admin/_modules.test.ts` — módulos do painel admin.

**E2E — Playwright** (`e2e/`, ver `e2e/README.md`): `chamados.spec.ts` dirige a
UI real contra o dev server e o banco de `DATABASE_URL`. O `global-setup` cria
fixture (tenant `e2e-chamados` + usuários) e assina cookies `ls_session` com o
`JWT_SECRET` do `.env` — sem credenciais reais; o `global-teardown` remove tudo.
Nunca rodar contra produção.

```bash
npm run test          # vitest run
npm run test:watch    # vitest em watch
npm run test:e2e      # playwright headless (npx playwright install chromium na 1ª vez)
npm run test:e2e:ui   # modo UI
```

---

## 7. Scripts operacionais

| Comando | O que faz |
|---------|-----------|
| `npm run clear:rondas` | `prisma/scripts/clear-rondas.ts` — apaga OcorrenciaDetalhe → RegistroAmbiente → RondaOcorrencia (todas) |
| `ts-node prisma/scripts/clear-rodadas.ts` | idem para inspeção de gases (Alteracao → Abastecimento → AmbienteInspecionado → Rodada) — sem script npm |
| `npm run expirar:rondas` | `prisma/scripts/expirar-rondas.ts` — finaliza (SQL cru) rondas abertas sem atualização há 24h |
| `npx prisma db seed` | `prisma/seed.ts` — tenants e usuários iniciais (upsert) |
| `npm run migrate:deploy` / `migrate:status` | `prisma migrate deploy` / `status` |
| `npm run build` | roda **`scripts/migrate-producao.mjs`** antes do `next build` — aplica migrations **somente** quando `VERCEL_ENV === 'production'` (previews compartilham a `DATABASE_URL` de produção e não devem migrar) |
| Cron HTTP | `GET/POST /api/cron/sync-trilogo` (Vercel Cron ou Bearer `CRON_SECRET`); `POST /api/rondas/expirar` (header `x-cron-secret`) |

Além dos crons, a expiração de rondas também acontece **on-demand** em
`ronda-draft.service.buscarDraft` (antes de oferecer "continuar ronda").
