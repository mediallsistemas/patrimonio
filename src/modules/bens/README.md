# Módulo `bens`

> Leitura de bens (assets) do ERP Trilogo para um tenant, com cache em memória e filtros por ambiente/bloco e por código de patrimônio.

## Responsabilidade

Buscar os bens da API pública do Trilogo (`GET {TRILOGO_BASE_URL}/asset`, header `token: TRILOGO_TOKEN`),
recortá-los para a unidade do tenant (via `trilogoCompanyId`/`trilogoProjectName` do `Tenant`) e oferecer
filtros em memória. Nada é persistido — o módulo é somente leitura sobre a API externa.

## Arquivos

| Arquivo | Papel |
|---|---|
| `bens.service.ts` | Fetch + cache + filtros; define a interface `BemTrilogo` (subset dos campos da API) |

## Funções públicas

| Função | Assinatura real | Descrição |
|---|---|---|
| `listarBensDoTenant` | `listarBensDoTenant(tenantId: string): Promise<BemTrilogo[]>` | Lê `trilogoCompanyId`/`trilogoProjectName` do tenant (via `prismaAuth`), busca **todos** os assets da API e filtra por `companyId` + `projectName` contido no `departmentFullAddress`; `[]` se o tenant não tem `trilogoCompanyId`; lança se `TRILOGO_TOKEN` ausente |
| `filtrarPorAmbiente` | `filtrarPorAmbiente(bens: BemTrilogo[], ambiente: string \| null, bloco: string \| null): BemTrilogo[]` | Casa bloco com o segmento 3 e ambiente com o segmento 4 do `departmentFullAddress` (split por `>`), `includes` bidirecional; **sem match, retorna a lista completa** para evitar tela vazia |
| `buscarPorPatrimonio` | `buscarPorPatrimonio(bens: BemTrilogo[], patrimony: string): BemTrilogo[]` | Filtro em memória por substring case-insensitive do código de patrimônio; query vazia → `[]` |

## Regras de negócio

- Cache em memória por chave `"companyId:projectName"` com TTL de 10 minutos — por instância de processo, sem invalidação manual.
- O recorte de unidade é `companyId` bater + `departmentFullAddress` conter `projectName` (maiúsculas); **tenant sem `trilogoProjectName` recebe todos os bens da empresa** (`if (!projectName) return true`).

## Modelos de banco

Nenhum próprio. Lê `Tenant` (`trilogoCompanyId Int?`, `trilogoProjectName String?`) via `prismaAuth`
(`lib/db-auth` — banco de auth, não o `prisma` padrão).

## Rotas de API que usam este módulo

| Método + caminho | Roles (guard real) | O que faz |
|---|---|---|
| `GET /api/me/bens/buscar?patrimony=` | `operator, operator_patrimonio, tenant_admin, admin_multi, viewer` (`verifyAuth`) | Busca bem por patrimônio na unidade ativa (`resolveActiveTenantId` — header `x-tenant-id` validado contra a sessão); usada no fluxo de manutenção de patrimônio e na abertura de chamado com bem |
| `GET /api/rondas/bens-tenant?ambiente=&bloco=` | `super_admin, tenant_admin, admin_multi, viewer, operator, operator_patrimonio` (`verifyAuthDetailed`) | Bens do ambiente/bloco atual da ronda (`filtrarPorAmbiente`), unidade via `resolveActiveTenantId` |

As rotas `/api/trilogo/*` e `/api/public/bens/[token]` **não** usam este módulo — têm fetch/caches próprios
(as primeiras recortam por `modules/trilogo/escopo`; a pública filtra pelo link).

## Consumo no client

- `src/services/manutencoes.service.ts` → `buscarBemPorPatrimonio(patrimony)` chama `/api/me/bens/buscar` (usado por `useManutencao` e pela tela de novo chamado).
- O fluxo de ronda consome `/api/rondas/bens-tenant` para vincular bem à ocorrência.

## Padrões aplicados

- Guard + unidade ativa resolvida no server, service puro sobre dados:

```ts
const tenantId = resolveActiveTenantId(session, req)
if (!tenantId) return forbidden()
const bens = await listarBensDoTenant(tenantId)
return ok(buscarPorPatrimonio(bens, patrimony))
```

- Cache com TTL para não bater na API do Trilogo a cada tecla de busca.

## Observações e cuidados

- **Divergência do módulo `trilogo`**: aqui o recorte ainda é o legado — `projectName` por `includes` e `if (!projectName) return true` (tenant sem projeto vê a empresa inteira). O módulo `modules/trilogo/escopo` fecha esse caso e casa por projeto/nome; os dois critérios podem divergir para o mesmo tenant.
- `filtrarPorAmbiente` com fallback "sem match → lista completa" significa que o filtro pode silenciosamente mostrar tudo quando os nomes de bloco/ambiente do tenant não batem com os segmentos do endereço Trilogo.
- A API do Trilogo é buscada **inteira** (`/asset`, sem paginação/filtro server-side) e filtrada em memória — o custo é amortizado pelo cache de 10 min.
- Usa `prismaAuth` (banco de auth) e não `prisma` — o `Tenant` vive lá.
- `super_admin` está nos roles de `/api/rondas/bens-tenant`, mas sem header `x-tenant-id` o `resolveActiveTenantId` devolve `null` (tenantId da sessão é null) → 403.
