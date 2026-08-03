# Módulo `movimentacoes`

> Registro de retiradas e devoluções de enxoval (Hotelaria), com regra de negócio "só devolve quem tem retirada pendente".

## Responsabilidade

Registrar e consultar `Movimentacao` (`tipo: 'retirada' | 'devolucao'`) por pessoa/tenant. Concentra o cálculo de pendências (retiradas − devoluções, nunca negativo) e a série diária usada pelo gráfico do dashboard. A invariante de negócio vive em `criarMovimentacao`: uma devolução sem pendência lança `NenhumaPendenteError`.

## Arquivos

| Arquivo | Papel |
|---|---|
| `movimentacoes.service.ts` | Queries Prisma: listar, contar pendentes (`groupBy`), criar (com regra de devolução), série por dia |
| `movimentacoes.types.ts` | `CriarMovimentacaoSchema` (Zod), tipos `MovimentacaoItem`, `MovimentacoesPorDia` e a classe `NenhumaPendenteError` |

## Funções públicas

| Função | Assinatura real | Descrição |
|---|---|---|
| `listarMovimentacoes` | `(tenantId: string \| null, limit: number) => Promise<MovimentacaoItem[]>` | Mais recentes primeiro, com join em `pessoa { nome, cpf }`; saída em snake_case (`pessoa_id`, `data_hora`, `pessoa_nome`, `pessoa_cpf`) |
| `contarPendentes` | `(tenantId: string, pessoaId: string) => Promise<number>` | Um `groupBy(['tipo'])` em vez de dois `count()`; `max(0, retiradas - devolucoes)` |
| `criarMovimentacao` | `(tenantId: string, pessoaId: string, tipo: 'retirada' \| 'devolucao') => Promise<{ id; pessoaId; tipo }>` | Para `devolucao`, valida pendência antes; sem pendência lança `NenhumaPendenteError` |
| `movimentacoesPorDia` | `(tenantId: string \| null, dias = 7) => Promise<MovimentacoesPorDia[]>` | 1 query no período + agregação em JS num `Map` pré-populado com todos os dias (`dd/MM`) — evita 14 round-trips |

Schema Zod (`CriarMovimentacaoSchema`): `pessoaId` UUID, `tipo` enum `['retirada', 'devolucao']`, `tenantSlug` opcional (terminal público).

## Modelos de banco

| Modelo Prisma | Tabela (`@@map`) | Campos-chave | Índices |
|---|---|---|---|
| `Movimentacao` | `movimentacoes` | `id (uuid)`, `pessoaId`, `tipo (String)`, `dataHora @default(now())`, `tenantId` | `[tenantId]`, `[pessoaId]`, `[tenantId, tipo]`, `[tenantId, dataHora]`, `[pessoaId, tipo]` |

Não há enum no banco para `tipo` (é `String`); a restrição vem do Zod/validação das rotas.

## Rotas de API que usam este módulo

| Rota | Roles (verifyAuth real) | O que faz |
|---|---|---|
| `GET /api/movimentacoes?limit=N` | `['super_admin', 'tenant_admin']` | Lista (super_admin: `tenantId = null`, cross-tenant; default `limit=50`) |
| `POST /api/movimentacoes` | Auth **opcional**: `verifyAuth(req)` sem roles; sem sessão, resolve tenant via `tenantSlug` do body | Valida com `CriarMovimentacaoSchema.safeParse`; `NenhumaPendenteError` → 400 |
| `POST /api/hotelaria/[tenantSlug]/movimentacoes` | **pública — sem auth** (middleware libera `/api/hotelaria/*`) | Terminal público: validação manual (`pessoaId`/`tipo` presentes e tipo válido), tenant pelo slug da URL; `NenhumaPendenteError` → 400 |

Consumidores indiretos: `dashboard.service.ts` importa `movimentacoesPorDia`, e `face-match.service.buscarPendentes` replica o cálculo de pendências sobre a mesma tabela.

## Consumo no client

Fluxo de retirada/devolução por reconhecimento facial (páginas `src/app/[tenantSlug]/hotelaria/retirada/page.tsx` e `.../devolucao/page.tsx`):

1. `CameraView` captura o descritor 128-dim (ver README de `face-match`).
2. `api.post('hotelaria/${slug}/verificar-face', { descriptor })` identifica a pessoa e retorna `pendentes`.
3. Usuário confirma → `api.post('hotelaria/${slug}/movimentacoes', { pessoaId, tipo: 'retirada' | 'devolucao' })`.

Existem também páginas legadas `/[tenantSlug]/retirada` e `/[tenantSlug]/devolucao` que postam em `/api/movimentacoes` **sem** `tenantSlug` no body — nesse caminho o tenant só resolve se houver sessão autenticada (sem cookie o middleware redireciona para `/login`). O dashboard (`/[tenantSlug]/dashboard`) exibe a lista via `GET /api/dashboard`.

## Padrões aplicados

- **Regra de negócio no service, não na rota:**
  ```ts
  if (tipo === 'devolucao') {
    const pendentes = await contarPendentes(tenantId, pessoaId)
    if (pendentes <= 0) throw new NenhumaPendenteError()
  }
  ```
- **Erro de domínio tipado:** `NenhumaPendenteError extends Error` — a rota faz `instanceof` e devolve `badRequest(error.message)` em vez de 500.
- **Zod no boundary:** `CriarMovimentacaoSchema.safeParse` em `POST /api/movimentacoes`.
- **Isolamento por tenant:** todas as queries filtram `tenantId` quando não é super_admin; os índices compostos (`[tenantId, tipo]`, `[tenantId, dataHora]`, `[pessoaId, tipo]`) cobrem os `groupBy`/ranges usados.

## Observações e cuidados

- **PII:** `listarMovimentacoes` retorna `pessoa_nome` e `pessoa_cpf` (CPF completo) — tratar como dado pessoal em novos consumidores.
- **Sem audit fields:** o modelo não tem `criadoPorId`/`criadoEm` (só `dataHora`) — divergência dos audit fields do CLAUDE.md; movimentações criadas pelo terminal público não registram autor.
- **Divergência — rota pública sem Zod:** `POST /api/hotelaria/[tenantSlug]/movimentacoes` valida manualmente (`!pessoaId || !tipo || !includes(tipo)`) em vez de usar `CriarMovimentacaoSchema`.
- **Race condition teórica:** a checagem de pendência e o `create` não estão numa transação — duas devoluções simultâneas podem passar ambas pela validação.
- `pessoaId` não é verificado contra o tenant resolvido: com um UUID de pessoa de outro tenant, o FK aceita e a movimentação nasce com `tenantId` de um tenant e `pessoaId` de outro (o cálculo de pendentes na rota pública usa `{ tenantId, pessoaId }`, então a devolução falharia, mas a retirada grava).
- Rate limiting de `/api/hotelaria/*` (regra de 20 req/min): existe no middleware mas não é efetivamente aplicada — ver README do `face-match`.
