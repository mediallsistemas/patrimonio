# Módulo `rondas`

> Ronda de ocorrências: ciclo de vida da ronda (criar, registrar ambientes, finalizar, expirar) + rascunho de auto-recuperação (`RondaDraft`).

## Responsabilidade

Toda a lógica de negócio e queries Prisma das rondas de ocorrência. Uma ronda (`RondaOcorrencia`) agrupa registros de ambiente (`RegistroAmbiente`), que podem conter ocorrências com foto (`OcorrenciaDetalhe`). O mesmo fluxo atende a **inspeção de gases** via `tipoRegistro: 'gases'` (campos `purezaO2`, `pressaoO2`, `pressaoAr`, `backupLigado`, abastecimento de cilindros) — ver Observações. Inclui também o padrão de rascunho/auto-recuperação por usuário (`ronda-draft.service.ts`).

## Arquivos

| Arquivo | Papel |
|---------|-------|
| `rondas.service.ts` | CRUD da ronda, registro de ambientes, expiração automática (24h), listagem admin |
| `ronda-draft.service.ts` | Persistência do rascunho JSON por `(tenantId, criadoPorId)` — upsert, busca com validação, descarte |
| `rondas.types.ts` | Schemas Zod (`RegistroAmbienteSchema` como discriminated union por `tipoRegistro`) e tipos inferidos |

## Funções públicas

| Função | Assinatura | Descrição |
|--------|-----------|-----------|
| `listarRondas` | `(tenantId: string \| null, limit = 50, criadoPorId?: string, tenantIds?: string[])` | Lista com select "light" (sem foto nas ocorrências); filtra por criador quando informado |
| `buscarRonda` | `(id: string, tenantId: string \| null, tenantIds?: string[])` | Busca uma ronda com ambientes + ocorrências (inclui foto) |
| `criarRonda` | `(tenantId: string, criadoPorId: string)` | Expira rondas velhas, **encerra rondas abertas do próprio usuário** (apaga as sem registros, finaliza as demais) e cria a nova — não devolve mais conflito |
| `finalizarRonda` | `(id: string, tenantId: string \| null, tenantIds?: string[])` | Seta `finalizadoEm = now()`; retorna `null` se não achou no escopo do tenant |
| `registrarAmbiente` | `(rondaId: string, input: RegistroAmbienteInput)` | Cria `RegistroAmbiente` + ocorrências aninhadas (`createMany`); atualiza `atualizadoEm` da ronda via SQL raw |
| `expirarRondasAbertas` | `(): Promise<{ expiradas: number }>` | `UPDATE` raw: finaliza rondas abertas com `atualizadoEm` > 24h atrás |
| `listarRondasAdmin` | `(limit = 100, tenantId?: string, tenantIds?: string[])` | Listagem cross-tenant (inclui `tenant` e foto das ocorrências) para o painel admin |
| `buscarDraft` | `(tenantId: string, userId: string)` | Busca draft; se o `estado.rondaId` aponta para ronda finalizada/inexistente, **deleta o draft e retorna null** |
| `salvarDraft` | `(tenantId: string, userId: string, estado: unknown)` | Upsert do JSON pelo unique `(tenantId, criadoPorId)` |
| `descartarDraft` | `(tenantId: string, userId: string): Promise<void>` | `deleteMany` do draft do usuário |

## Modelos de banco

| Modelo | Tabela | Campos-chave | Índices |
|--------|--------|--------------|---------|
| `RondaOcorrencia` | `rondas_ocorrencias` | `iniciadoEm`, `finalizadoEm?`, `atualizadoEm @updatedAt`, `tenantId`, `criadoPorId` | `[tenantId]`, `[tenantId, iniciadoEm]`, `[finalizadoEm]` |
| `RegistroAmbiente` | `registros_ambientes` | `rondaId`, `ambiente` (texto, sem FK), `tipoRegistro` (`ocorrencia`\|`gases`), `temOcorrencia`, campos de gases nullable | `[rondaId]` |
| `OcorrenciaDetalhe` | `ocorrencias_detalhe` | `registroId`, `tipo`, `descricao`, `foto?` (base64), `trilogoChamado`, `bemPatrimony?`, `bemDescricao?` | `[registroId]` |
| `RondaDraft` | `rondas_draft` | `tenantId`, `criadoPorId`, `estado Json`, `atualizadoEm @updatedAt` | `@@unique([tenantId, criadoPorId])` |

## Rotas de API que usam este módulo

| Rota | Roles (verifyAuthDetailed) | O que faz |
|------|---------------------------|-----------|
| `GET /api/rondas` | `super_admin`, `tenant_admin`, `admin_multi`, `viewer`, `operator` | Lista rondas da **unidade ativa** (`resolveActiveTenantId`; não passa `tenantIds`); operator só vê as próprias via `criadoPorId`; expira rondas velhas antes |
| `POST /api/rondas` | `tenant_admin`, `admin_multi`, `viewer`, `operator` | Cria ronda na unidade ativa; rondas abertas do usuário são encerradas antes (o antigo `409 conflict` prendia o usuário em loop quando o draft já tinha sido descartado) |
| `PATCH /api/rondas/[id]` | `super_admin`, `tenant_admin`, `admin_multi`, `viewer`, `operator` | Finaliza a ronda (escopada por unidade ativa + `tenantIds`) |
| `POST /api/rondas/[id]/ambientes` | `super_admin`, `tenant_admin`, `admin_multi`, `viewer`, `operator` | Valida com `RegistroAmbienteSchema`, checa ronda aberta (409 se finalizada), registra ambiente |
| `GET/PUT/DELETE /api/rondas/draft` | `super_admin`, `tenant_admin`, `admin_multi`, `viewer`, `operator` | Busca / upsert / descarta o draft; tenant do draft = `resolveActiveTenantId(...) ?? SUPER_ADMIN_TENANT` |
| `POST /api/rondas/expirar` | header `x-cron-secret` = `CRON_SECRET` (`timingSafeEqual`, sem JWT) | Executa `expirarRondasAbertas()` via cron |
| `GET /api/admin/rondas` | `super_admin`, `tenant_admin`, `admin_multi`, `viewer` | Listagem admin via `escopoLeitura(session)`: super_admin global; demais recebem `tenantIds` do escopo (1 ou N); escopo vazio → `ok([])` |

O role `admin_multi` (e seu alias legado `viewer`) opera em várias unidades: a "unidade ativa" vem do header `x-tenant-id`, aceito apenas se `canScopeTenant(session, id)` confirmar acesso (`@/modules/auth/tenant-filter`).

## Consumo no client

- `src/services/rondas.service.ts` — `listar`, `criar`, `finalizar`, `registrarAmbiente`, `buscarDraft`, `salvarDraftAPI`, `descartarDraftAPI`, `buscarBlocos` (via `/api/me/blocos`), `buscarFotoOcorrencia`.
- `src/services/admin-rondas.service.ts` — `listarRondas()` → `GET /api/admin/rondas`.
- Hooks: `useRondaBase` (base compartilhada), `useRonda` (fluxo tenant `/[tenantSlug]/ronda`) e `useOcorrenciaRonda` (fluxo `/ocorrencias`) — ambos estendem `useRondaBase` via `onIniciar`/`onAbandonar`.
- Libs de apoio: `src/lib/ronda-tipos.ts` (labels/cores de tipos de ocorrência) e `src/lib/rondas-admin-utils.ts` (`desnormalizarOcorrencias`, `agruparPorData` sobre o tipo `Ronda` retornado pelas rotas) — usados pelas páginas de histórico/admin.

### Ciclo de vida do draft (como implementado em `useRondaBase`)

1. **Mount:** `buscarDraft()` — se há draft com `rondaId` e etapa ≠ `resumo_final`, exibe banner "retomar/descartar".
2. **Durante a ronda:** cada mutação de estado (incluindo cada ambiente concluído em `salvarLocalComDetalhes`) agenda `salvarDraftAPI` com debounce de `DRAFT_DEBOUNCE_MS = 1500ms`.
3. **Finalizar:** cancela o timer de debounce, chama `PATCH /api/rondas/[id]` e depois `DELETE /api/rondas/draft`.
4. **Guarda server-side:** `buscarDraft` deleta o draft sozinho se a ronda apontada já foi finalizada/expirada — o banner nunca oferece retomar ronda morta.
5. **Erro 404/409 ao registrar ambiente:** o hook interpreta como ronda expirada, descarta o draft e reseta o estado.

## Padrões aplicados

- **Guard + roles:** `const auth = await verifyAuthDetailed(req, ['tenant_admin', 'admin_multi', 'viewer', 'operator']); if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()`.
- **Isolamento por tenant:** `tenantFilter({ tenantId, tenantIds })` (de `@/modules/auth/tenant-filter`) em todos os `where`; `super_admin` passa `tenantId: null`. Nas rotas, o tenant vem de `resolveActiveTenantId(session, req)` (header `x-tenant-id` validado) ou `escopoLeitura(session)` — nunca reconstruído inline.
- **Zod na borda:** `RegistroAmbienteSchema.safeParse(await req.json())` em `POST /api/rondas/[id]/ambientes`; schemas vivem em `rondas.types.ts`.
- **Foto base64:** `foto: z.string().max(2_000_000)` (~1,5 MB); lazy load no client com `FotoLazy.tsx`.
- **Erros:** `console.error('[rondas.service] fn:', error)` + rethrow; rotas devolvem `serverError('...')` sem detalhes.
- **`criadoPorId` sempre do JWT** (`session.sub`), nunca do body.

## Observações e cuidados

- **Tabela compartilhada:** `RegistroAmbiente.tipoRegistro` (`ocorrencia`|`gases`) faz a ronda de ocorrências e a inspeção de gases nova coexistirem na mesma tabela — campos de gases são nullable. Não confundir com o módulo `rodadas` (fluxo de gases legado, tabelas próprias).
- **Expiração (24h):** três gatilhos — inline em `GET /api/rondas`, `criarRonda` e `buscarDraft`; cron via `POST /api/rondas/expirar`; e o script manual `prisma/scripts/expirar-rondas.ts` (mesmo SQL). `registrarAmbiente` renova `atualizadoEm` via `$executeRaw` para a ronda ativa não expirar no meio.
- **Divergências do CLAUDE.md:** rotas usam `verifyAuthDetailed` (não o `verifyAuth` documentado); `POST /api/rondas/expirar` usa `NextResponse.json` direto (não os helpers); `registrarAmbiente` não usa `$transaction` (nested `createMany` + um `$executeRaw` separado — a atualização de `atualizadoEm` não é atômica com o insert); o payload real do JWT tem `tenantIds` e o role `admin_multi`, não documentados; `viewer` (documentado como read-only) é hoje **alias legado de `admin_multi`** e tem acesso a rotas de escrita (`POST /api/rondas`, `POST .../ambientes`).
- **`listarRondasAdmin`:** o filtro usa `tenantIds.length > 0` (não `> 1`) de propósito — com exatamente 1 id o `in` equivale à igualdade; a versão anterior deixava o caso de 1 tenant cair no fallback e, sem `tenantId`, abria a consulta cross-tenant.
- **Draft do super_admin:** `/api/rondas/draft` usa o tenant placeholder fixo `00000000-0000-0000-0000-000000000001` quando `role === 'super_admin'` (FK de `RondaDraft.tenantId` exige um tenant existente).
- `salvarDraftAPI` no client usa `fetch` cru (fora do wrapper `api`) e o `PUT` do draft aceita `estado` sem validação Zod (JSON livre).
