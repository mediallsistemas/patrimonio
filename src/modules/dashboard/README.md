# Módulo `dashboard`

> Agrega métricas do módulo Hotelaria (pessoas, retiradas, devoluções, pendências) em 7 queries fixas, independente do volume de dados.

## Responsabilidade

Montar o payload `DashboardData` consumido pelas telas de dashboard: totais do dia, pendências por pessoa (retiradas − devoluções), gráfico dos últimos 7 dias e as 15 movimentações mais recentes. Substitui deliberadamente o padrão N+1 (2 queries por pessoa) por `groupBy` + agregação em JS — os comentários no próprio service documentam isso.

Não possui schema Zod próprio: o único input é `tenantId` (e `tenantIds` opcional), resolvido pela rota, nunca pelo body.

## Arquivos

| Arquivo | Papel |
|---|---|
| `dashboard.service.ts` | Única função do módulo: `getDashboardData` (queries Prisma + agregação) |
| `dashboard.types.ts` | Interfaces `DashboardData`, `DashboardRecenteItem`, `DashboardMovimentacaoDia` |

## Funções públicas

| Função | Assinatura real | Descrição |
|---|---|---|
| `getDashboardData` | `(tenantId: string \| null, tenantIds?: string[]) => Promise<DashboardData>` | `tenantId: null` = visão global (super_admin). Executa: 4 queries paralelas (count de pessoas, retiradas hoje, devoluções hoje, 15 recentes com `pessoa.nome/cpf`), 2 `groupBy` por `pessoaId` para calcular `totalPendentes`, e 1 chamada a `movimentacoesPorDia(tenantId, 7)` do módulo `movimentacoes` |

O filtro de tenant é montado por `tenantFilter({ tenantId, tenantIds })` de `@/modules/auth/tenant-filter` — se `tenantIds` tiver 1+ itens gera `{ tenantId: { in: ids } }` (sessões multi-unidade, role `admin_multi`; `viewer` é alias legado); senão, `tenantId` único; com ambos vazios gera `{}` (sem filtro, cross-tenant).

## Modelos de banco

O módulo não define modelos próprios; lê os do Hotelaria:

| Modelo Prisma | Tabela (`@@map`) | Campos-chave | Índices |
|---|---|---|---|
| `Pessoa` | `pessoas` | `id`, `nome`, `cpf`, `faceDescriptor`, `tenantId` | `@@unique([tenantId, cpf])`, `@@index([tenantId])` |
| `Movimentacao` | `movimentacoes` | `id`, `pessoaId`, `tipo`, `dataHora`, `tenantId` | `[tenantId]`, `[pessoaId]`, `[tenantId, tipo]`, `[tenantId, dataHora]`, `[pessoaId, tipo]` |

## Rotas de API que usam este módulo

| Rota | Roles (verifyAuth real) | O que faz |
|---|---|---|
| `GET /api/dashboard` | **nenhum `verifyAuth` na rota** (comentário no código diz "Rota pública") | `getDashboardData(null)` — dados globais cross-tenant |
| `GET /api/admin/dashboard?tenantId=...` | `['super_admin']` | Valida o tenant via `buscarTenant` e retorna `{ tenant, ...getDashboardData(tenantId) }` |

Sobre `GET /api/dashboard`: a rota em si não autentica, mas o `src/middleware.ts` redireciona requests sem cookie `ls_session` para `/login` (a rota não está em `PUBLIC_PATHS`). Ou seja: exige sessão na prática, porém **qualquer role autenticado de qualquer tenant** recebe os dados globais.

## Consumo no client

- `src/app/[tenantSlug]/dashboard/page.tsx` — `useQuery` + `api.get<DashboardStats>('dashboard')` → `GET /api/dashboard`. Renderiza cards de contagem, gráfico Recharts (`movimentacoesPorDia`) e a lista de recentes agrupada por pessoa (pareia retirada → devolução em JS). CPF é exibido via `formatarCPFDisplay`.
- `src/services/admin-dashboard.service.ts` — `buscarMetricas(tenantId)` → `GET /api/admin/dashboard?tenantId=...`, tipado como `TenantDashboardStats` (usado no painel admin).

## Padrões aplicados

- **Guard de auth (rota admin):**
  ```ts
  const session = await verifyAuth(req, ['super_admin'])
  if (!session) return forbidden()
  ```
- **Isolamento por tenant** centralizado em `tenantFilter`:
  ```ts
  const whereBase = tenantFilter({ tenantId, tenantIds })
  prisma.pessoa.count({ where: whereBase })
  ```
- **Agregação eficiente:** 2 `groupBy` por `pessoaId` + `Map` em JS para pendentes; `movimentacoesPorDia` faz 1 query e agrega os 7 dias em memória (em vez de 14 queries).
- **Erro:** `try/catch` com log `[dashboard.service] getDashboardData:` e `serverError()` na rota, sem vazar detalhes.

## Observações e cuidados

- **PII no payload:** `recentes` inclui `pessoa_nome` e `pessoa_cpf` (CPF completo, 11 dígitos). Qualquer consumidor novo deve tratar isso como dado pessoal (LGPD) — não logar nem cachear publicamente.
- **Divergência — isolamento de tenant:** `GET /api/dashboard` chama `getDashboardData(null)` (global) e é servida a qualquer usuário autenticado, inclusive pela página tenant-scoped `/[tenantSlug]/dashboard`. Não há filtro por tenant da sessão nessa rota — contraria a regra "tenant isolation mandatory" do CLAUDE.md.
- **Divergência — comentário vs. realidade:** o comentário "Rota pública — sem autenticação necessária" em `api/dashboard/route.ts` não bate com o middleware, que redireciona quem não tem cookie.
- O parâmetro `tenantIds` de `getDashboardData` existe para sessões multi-tenant (via `tenantFilter`), mas nenhuma das duas rotas atuais o repassa.
- "Hoje" e o bucketing do gráfico usam o fuso do servidor (`date-fns startOfDay/endOfDay`), não o do usuário.
