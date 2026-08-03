# Módulo `tenants`

> CRUD de tenants (hospitais/unidades) e resolução por slug, incluindo configuração da integração Trilogo.

Modelo de permissões e alcance por papel: **`docs/PERMISSOES.md`**.

## Responsabilidade

Centraliza as queries Prisma sobre o modelo `Tenant`: listagem (admin e pública), busca por id/slug, criação com normalização de slug, atualização parcial e exclusão. Os schemas Zod de entrada (`CreateTenantSchema`, `UpdateTenantSchema`) vivem em `tenants.types.ts` e são consumidos pelas rotas admin. A busca por slug é reutilizada por rotas de hotelaria, feedback e configuração de blocos/ambientes para resolver o tenant da URL. Só `super_admin` cria/edita/exclui unidades; `admin_multi` e `tenant_admin` apenas listam as suas para seletores.

## Arquivos

| Arquivo | Papel |
|---------|-------|
| `tenants.service.ts` | Todas as queries Prisma (via `prismaAuth`, alias do client principal) + normalização de dados |
| `tenants.types.ts` | `CreateTenantSchema`, `UpdateTenantSchema` (Zod) e tipos inferidos |

## Funções públicas

| Função | Assinatura | Descrição |
|--------|-----------|-----------|
| `buscarTenantPorSlug` | `(slug: string) => Promise<Tenant \| null>` | Busca por slug único; seleciona `id, slug, nome, logoUrl, ativo, trilogoCompanyId, trilogoProjectName, linensistem` |
| `listarTenantsPublico` | `() => Promise<Tenant[]>` | Somente `ativo: true`, ordenado por nome |
| `listarTenants` | `() => Promise<Tenant[]>` | Lista completa (inclui inativos) com `_count.usuarios`, ordenada por `criadoEm` |
| `buscarTenant` | `(id: string) => Promise<Tenant \| null>` | Busca por id com `_count.usuarios` (usada pelo dashboard admin) |
| `criarTenant` | `(input: CreateTenantInput) => Promise<Tenant>` | Normaliza slug (`lowercase`, trim, espaços→hífen) e cria com config Trilogo opcional |
| `atualizarTenant` | `(id: string, input: UpdateTenantInput) => Promise<Tenant>` | Update parcial: `nome`, `ativo`, `trilogoCompanyId`, `trilogoProjectName`, `linensistem` |
| `deletarTenant` | `(id: string) => Promise<void>` | **Hard delete** — sem soft delete; falha se houver FKs dependentes |

## Modelos de banco

| Modelo | Tabela (@@map) | Campos-chave | Índices |
|--------|----------------|--------------|---------|
| `Tenant` | `tenants` | `id (uuid)`, `slug @unique`, `nome`, `ativo`, `logoUrl?`, `trilogoCompanyId? (Int)`, `trilogoProjectName?`, `linensistem @map("linenSistem")`, `criadoEm`, `atualizadoEm` | apenas `slug @unique` |

Relações: `usuarios`, `blocos`, `ambientes`, `rondasOcorrencias`, `rodadas`, `chamados`, `agendamentosManutencao`, `manutencoesRealizadas`, `pessoas`, `movimentacoes`, `templatesFormulario`, `respostasFormulario`, `rondasDraft`.

## Rotas de API que usam este módulo

| Método + caminho | Roles permitidos | O que faz |
|------------------|------------------|-----------|
| `GET /api/admin/tenants` | `super_admin`, `tenant_admin`, `admin_multi`, `viewer` | super_admin: `listarTenants()`; não-super: Prisma **direto na rota** com `id IN allowedTenantIds(session)` (`{id, slug, nome}` para seletores) |
| `POST /api/admin/tenants` | `super_admin` | Valida `CreateTenantSchema`, `criarTenant()`, dispara sync Trilogo em background (fire-and-forget); `conflict()` para slug duplicado |
| `PATCH /api/admin/tenants/[id]` | `super_admin` | Valida `UpdateTenantSchema`, `atualizarTenant()` |
| `DELETE /api/admin/tenants/[id]` | `super_admin` | `deletarTenant()` → 204 |
| `GET /api/tenants` | `super_admin` | `listarTenantsPublico()` mapeado para `{ id, slug, name, logoUrl, active }` (contrato em inglês da SPA) |
| `GET /api/tenants/[slug]` | qualquer autenticado | `buscarTenantPorSlug()` → shape em inglês |
| `GET /api/tenants/[slug]/blocos`, `/ambientes`, `/form-templates`, `/form-templates/[formSlug]` | autenticado | Usam `buscarTenantPorSlug` para resolver o tenant da URL |
| `GET /api/hotelaria/[tenantSlug]/pessoas`, `/movimentacoes` | autenticado | Idem — resolução de slug |
| `GET /api/admin/dashboard` | (via `buscarTenant`) | Dados do tenant no dashboard admin |
| `GET /api/me/tenant` | `tenant_admin`, `super_admin`, `admin_multi`, `viewer` | **Não usa o service** — resolve a unidade ativa com `resolveActiveTenantId` (header `x-tenant-id` validado por `canScopeTenant`) e busca via `prismaAuth` direto |
| `GET /api/me/tenants` | `super_admin`, `tenant_admin`, `admin_multi`, `viewer` | **Não usa o service** — fonte canônica dos seletores de unidade: super_admin → todas ativas; demais → `allowedTenantIds(session)` |

## Consumo no client

- `src/services/admin-tenants.service.ts` — `listarTenants()` (`admin/tenants`), `listarMeusTenants()` (`me/tenants` — alimenta `UnitSelector`, filtros de página e o modal de criar usuário), `criarTenant()`.
- `src/services/me.service.ts` — `buscarMeuTenant()` (`me/tenant`, agora com `id`/`slug` no shape), `buscarMeusTenants()`.
- `src/hooks/useAdminTenants.ts` — `useTenantsList`, `useCreateTenant` (painel admin).
- `src/hooks/useAdminUsuarios.ts` — `useTenants(enabled)` reutiliza `listarTenants()` para o select de tenant em `ModalCriarUsuario`.

## Padrões aplicados

- **Guard**: `await verifyAuth(req, ['super_admin'])` nas mutações; leitura com os 4 papéis admin (`ADMIN_ROLES`).
- **Escopo centralizado**: leituras não-super usam `allowedTenantIds`/`resolveActiveTenantId` de `modules/auth/tenant-filter.ts` — nunca reconstruir inline.
- **Zod na borda**: `CreateTenantSchema.safeParse(await req.json())` → `badRequest(...)` com `fieldErrors` (serializado com `JSON.stringify`, ligeira variação do padrão).
- **Helpers de resposta**: `ok/created/noContent/badRequest/conflict/forbidden/notFound/serverError` de `lib/api-response.ts` em todas as rotas admin.
- **Tratamento de erro**: `try/catch` no service com log `[tenants.service] fn:` e rethrow; a rota converte mensagens Prisma (`Unique constraint`, `Record to update not found`) em `conflict`/`notFound` por *string matching*.
- **Normalização**: slug sempre `toLowerCase().trim().replace(/\s+/g, '-')` no service, além do regex `^[a-z0-9-]+$` do Zod.

## Observações e cuidados

- **Sem soft delete**: `deletarTenant` é `prisma.tenant.delete` — com as dezenas de relações do modelo, tende a falhar por FK se o tenant tiver dados. Não há `deletadoEm`.
- **Divergências do CLAUDE.md**: `GET /api/admin/tenants` (branch não-super), `me/tenant` e `me/tenants` fazem query Prisma dentro da rota; o flag documentado como `feedbackForms` no CLAUDE.md não existe — o real é `linensistem` (coluna física `linenSistem`).
- **`admin_multi` (e `viewer`, alias legado) só listam** as unidades de `tenantIds`; criar/editar/excluir/sync é exclusivo de `super_admin` (matriz em PERMISSOES.md §4).
- **Unidade ativa vs agregação**: `me/tenant` responde pela unidade do header `x-tenant-id` (validado); `me/tenants` responde a SOMA das unidades — não confundir os dois contratos.
- **Sync Trilogo no POST é fire-and-forget**: falha silenciosa; refazer via `POST /api/admin/tenants/[id]/sync-trilogo`.
- **Detecção de erro por substring da mensagem Prisma** é frágil — se o Prisma mudar as mensagens, `conflict`/`notFound` viram `serverError`.
- `prismaAuth` é apenas um alias do Prisma client principal (`lib/db-auth.ts`) — tenants moram no mesmo banco do restante, ao contrário de `usuarios`, que consulta o pool `AUTH_DATABASE_URL`.
