# Módulo `ambientes`

> Configuração de blocos e ambientes por tenant (`BlocoTenant`/`AmbienteTenant`) + sincronização espelhada com os assets do ERP Trilogo.

## Responsabilidade

Mantém a árvore bloco → ambiente que alimenta os formulários de ronda e inspeção. Duas origens: cadastro manual (`criarAmbiente`) e sincronização com o Trilogo, que extrai bloco/ambiente do `departmentFullAddress` de cada asset e **espelha** o que a API devolve (cria o que apareceu, deleta o que sumiu). Classifica ambiente como `gases` ou `ocorrencia` por heurística de palavras-chave.

## Arquivos

| Arquivo | Papel |
|---------|-------|
| `ambientes.service.ts` | Listagens, criação manual, fetch/cache dos assets Trilogo (TTL 30 min) e o espelhamento `sincronizarAmbientesTrilogo` |
| `ambientes.types.ts` | `CreateAmbienteSchema` (Zod): `nome`, `ordem?`, `tipo: 'ocorrencia' \| 'gases'` (default `ocorrencia`) |

## Funções públicas

| Função | Assinatura | Descrição |
|--------|-----------|-----------|
| `listarAmbientes` | `(tenantId: string)` | Ambientes ativos do tenant, ordenados por `ordem, nome` |
| `listarBlocos` | `(tenantId: string)` | Blocos ativos com seus ambientes ativos aninhados |
| `criarAmbiente` | `(tenantId: string, input: CreateAmbienteInput)` | Cria ambiente manual (sem `blocoId`) |
| `sincronizarTenant` | `(tenantId: string): Promise<{ blocosCriados; ambientesCriados; ambientesRemovidos; blocosRemovidos } \| null>` | Busca assets do Trilogo (cache 30 min), filtra pelo tenant via `pertenceAoTenant` (`@/modules/trilogo/escopo`) e delega ao espelhamento; `null` se o tenant não tem `trilogoCompanyId` |
| `sincronizarAmbientesTrilogo` | `(tenantId: string, assets: TrilogoAsset[], blocoFallback = 'Geral')` | Espelha blocos/ambientes: bloco = seg[3] e ambiente = seg[4] do `departmentFullAddress` (com 4 segmentos usa `blocoFallback`); cria os novos e **deleta** os ausentes |

Heurística de tipo: `GAS_KEYWORDS = ['GAS', 'O2', 'OXIG', 'USINA', 'OXIGÊNIO', 'OXIGENIO']` — se bloco ou ambiente contém alguma, `tipo = 'gases'`.

## Modelos de banco

| Modelo | Tabela | Campos-chave | Índices |
|--------|--------|--------------|---------|
| `BlocoTenant` | `blocos_tenant` | `tenantId`, `nome`, `ordem`, `ativo` | `[tenantId]` |
| `AmbienteTenant` | `ambientes_tenant` | `tenantId`, `blocoId?`, `nome`, `ordem`, `ativo`, `tipo` (`ocorrencia`\|`gases`); relações com `ManutencaoRealizada` e `Chamado` | `[tenantId]`, `[blocoId]` |

## Rotas de API que usam este módulo

| Rota | Roles (verifyAuth real) | O que faz |
|------|-------------------------|-----------|
| `GET /api/me/blocos` | `super_admin`, `tenant_admin`, `admin_multi`, `viewer`, `operator`, `operator_patrimonio` | Blocos da unidade ativa (`resolveActiveTenantId`); cache em memória 5 min (`lib/blocos-cache.ts`); sem tenant → `ok([])` |
| `GET /api/admin/blocos?tenantId=` | `super_admin`, `tenant_admin`, `admin_multi`, `viewer` | Blocos de um tenant alvo; `canScopeTenant` valida o acesso |
| `GET /api/tenants/[slug]/ambientes` | `super_admin`, `tenant_admin`, `admin_multi`, `viewer`, `operator`, `operator_patrimonio` | Lista ambientes do tenant do slug; `canScopeTenant` |
| `POST /api/tenants/[slug]/ambientes` | `super_admin`, `tenant_admin`, `admin_multi`, `viewer` | Cria ambiente manual (Zod `CreateAmbienteSchema`) |
| `GET /api/tenants/[slug]/blocos` | `super_admin`, `tenant_admin`, `admin_multi`, `viewer`, `operator`, `operator_patrimonio` | Lista blocos do tenant do slug |
| `POST /api/admin/tenants` | `super_admin` | Ao criar tenant com vínculo Trilogo, dispara `sincronizarAmbientesTrilogo` fire-and-forget (falha silenciosa) |
| `POST /api/admin/tenants/[id]/sync-trilogo` | `super_admin` | Sincroniza um tenant sob demanda e invalida o cache de blocos |
| `GET`/`POST /api/cron/sync-trilogo` | `Authorization: Bearer <CRON_SECRET>` (`timingSafeEqual`, sem JWT) | Sincroniza todos os tenants com `trilogoCompanyId` (`Promise.allSettled`), invalida caches e depois importa chamados do Trilogo |

## Consumo no client

- `src/services/rondas.service.ts` — `buscarBlocos()` → `/api/me/blocos`; `buscarBlocosAdmin(tenantId)` → `/api/admin/blocos`; `buscarAmbientesTenant(slug)` → `/api/tenants/[slug]/ambientes`.
- Hook `useRondaBase` chama `buscarBlocos()` no mount — a árvore bloco → ambiente vira a navegação da ronda (etapas blocos/locais), e `AmbienteAPI.tipo` decide o fluxo (`gases` → medições; `ocorrencia` → pergunta de ocorrência).
- Telas de admin/chamados usam `buscarBlocosAdmin` para abrir chamado apontando ambiente de outro tenant.
- `src/lib/blocos-cache.ts` (server): `Map` em memória por `tenantId`, `BLOCOS_TTL = 5 min`, invalidado por `invalidarCacheBlocos` após cada sync.

## Padrões aplicados

- **Guard + escopo multi-unidade:** `verifyAuth(req, [...roles])` + `canScopeTenant(session, tenant.id)` (admin_multi acessa qualquer um de seus `tenantIds`):

```ts
const session = await verifyAuth(req, ['super_admin', 'tenant_admin', 'admin_multi', 'viewer'])
if (!session) return forbidden()
if (!canScopeTenant(session, tenant.id)) return forbidden()
```

- **Isolamento por tenant:** todo `where` das listagens inclui `tenantId` explícito; o espelhamento também opera só nas linhas do `tenantId` recebido.
- **Zod na borda:** `CreateAmbienteSchema.safeParse(await req.json())` no `POST` de ambientes.
- **Erros:** `console.error('[ambientes.service] fn:', error)` + rethrow nas listagens; rotas usam helpers (`ok`, `created`, `badRequest`, `forbidden`, `serverError`).
- **Cache com proteção contra vazio:** `fetchAllTrilogoAssets` só grava o cache se a API devolveu itens (array vazio pode ser erro silencioso — e cachear vazio apagaria tudo no espelhamento).

## Observações e cuidados

- **Sync é destrutivo:** `sincronizarAmbientesTrilogo` faz **hard delete** de ambientes e blocos que saíram da API (ignora o flag `ativo` — não é soft delete). Rondas históricas não quebram porque `RegistroAmbiente.ambiente` guarda o nome como texto, sem FK — mas `AmbienteTenant` tem FKs de `ManutencaoRealizada` e `Chamado`, que podem falhar num delete.
- **Filtro de escopo endurecido:** `sincronizarTenant` usa `pertenceAoTenant` (`@/modules/trilogo/escopo`) — tenant sem nada que o identifique **não** casa asset nenhum. Antes, tenant sem `trilogoProjectName` puxava a empresa inteira, e como o sync apaga o que não vem na lista, errar aqui era destrutivo.
- **Sem `$transaction`:** o espelhamento faz vários writes sequenciais; uma falha no meio deixa o tenant meio-sincronizado (a próxima execução corrige).
- **Divergências do CLAUDE.md:** rotas retornam `forbidden()` mesmo para sessão ausente (deveria ser `unauthorized()`); `viewer` (documentado read-only) cria ambientes via `POST /api/tenants/[slug]/ambientes` (é alias legado de `admin_multi`); `sincronizarTenant`/`sincronizarAmbientesTrilogo` não seguem o padrão try/catch com prefixo `[ambientes.service]`; usa dois Prisma clients (`prisma` e `prismaAuth` de `lib/db-auth`); rota de cron autentica por Bearer `CRON_SECRET` fora do padrão JWT (um atalho anterior que aceitava `x-vercel-cron-signature` sem conferir o valor foi removido por ser burlável).
- **Caches em memória** (assets 30 min, blocos 5 min) são por processo — em deploy serverless/multi-instância cada instância tem o seu, e a invalidação pós-sync só atinge a instância que executou o sync.
- O nome do bloco é a chave de igualdade do espelhamento (comparação case-insensitive por `toUpperCase()`); renomear um bloco no Trilogo = deletar e recriar aqui (ambientes recriados, `ordem` recomeça).
