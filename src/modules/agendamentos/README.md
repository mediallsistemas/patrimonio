# Módulo `agendamentos`

> Agendamentos de manutenção preventiva de bens do Trilogo: criar, listar e marcar como realizado/cancelado.

## Responsabilidade

CRUD mínimo de `AgendamentoManutencao`: um bem do Trilogo (`trilogoAssetId` + `patrimony`) recebe um
agendamento com data, título e observação; depois o status muda para `realizado` (com `dataRealizada`)
ou `cancelado`. Os agendamentos aparecem no modal de bens do admin e na página pública `/bem/[token]`
(estes via módulo `links-publicos`).

## Arquivos

| Arquivo | Papel |
|---|---|
| `agendamentos.service.ts` | Queries Prisma (listar, criar, atualizar status) |
| `agendamentos.types.ts` | Schemas Zod `CreateAgendamentoSchema` e `UpdateAgendamentoSchema` |

## Funções públicas

| Função | Assinatura real | Descrição |
|---|---|---|
| `listarAgendamentos` | `listarAgendamentos(tenantId: string \| null)` | Todos com `status != 'cancelado'`, ordenados por `dataAgendada asc`; `tenantId null` (super_admin) → sem filtro de tenant (cross-tenant) |
| `criarAgendamento` | `criarAgendamento(input: CreateAgendamentoInput, criadoPorId: string, tenantId: string \| null)` | Cria com snapshot do bem (`patrimony`, `descricaoBem`, `companyId`, `companyName`, `ambiente`); `criadoPorId` sempre do JWT |
| `atualizarStatusAgendamento` | `atualizarStatusAgendamento(id: string, input: UpdateAgendamentoInput, atualizadoPorId: string)` | `status: 'realizado' \| 'cancelado'`; grava `dataRealizada` se enviada e `atualizadoPorId` |

## Regras de negócio

- `CreateAgendamentoSchema`: `trilogoAssetId`/`companyId` inteiros positivos, `dataAgendada` ISO 8601 (string), `titulo` obrigatório (máx. 200), `observacao` opcional (máx. 1000).
- `UpdateAgendamentoSchema`: só `status` (`realizado|cancelado`) e `dataRealizada` opcional — não há edição de data/título após criado.
- Cancelados somem da listagem (`status: { not: 'cancelado' }`), mas não são deletados.
- Não há máquina de estados: nada impede marcar `realizado` de novo ou "des-cancelar" via novo PATCH.

## Modelos de banco

| Modelo | Tabela | Campos-chave | Índices |
|---|---|---|---|
| `AgendamentoManutencao` | `agendamentos_manutencao` | `trilogoAssetId Int`, `patrimony`, `descricaoBem`, `companyId`, `companyName`, `ambiente`, `dataAgendada`, `titulo @default("Manutenção")`, `observacao?`, `status @default("pendente")` (`pendente\|realizado\|cancelado`), `dataRealizada?`, `criadoPorId`, `atualizadoPorId?`, `tenantId String?` (nullable) | `[tenantId]`, `[companyId]` |

## Rotas de API que usam este módulo

| Método + caminho | Roles (guard real) | O que faz |
|---|---|---|
| `GET /api/agendamentos` | `super_admin, tenant_admin, admin_multi, viewer, operator_patrimonio` (`verifyAuth` + `assertSistema(session, 'linensistem')`) | Lista; tenant vem de `resolveActiveTenantId(session, req)` (header `x-tenant-id` validado contra as unidades da sessão) |
| `POST /api/agendamentos` | mesmos roles | Cria (`CreateAgendamentoSchema`); tenant idem acima |
| `PATCH /api/agendamentos/[id]` | mesmos roles | Atualiza status; `Record to update not found` → 404 |

Os agendamentos também são lidos por `GET /api/bens/agendamentos-publicos` e `GET /api/public/bens/[token]`,
mas via `listarAgendamentosPorAssets` do módulo `links-publicos` (ver README daquele módulo).

## Consumo no client

- `src/services/agendamentos.service.ts` — apenas `listar()` (tipo `Agendamento` importado de `src/app/admin/bens/bens.types`).
- Criação e atualização **não passam por service**: `src/app/admin/bens/components/ModalAgendamento.tsx` faz `fetch('/api/agendamentos', ...)` e `fetch('/api/agendamentos/${id}', ...)` direto, com invalidação da query `['agendamentos']` (TanStack Query em `src/app/admin/bens/page.tsx`).

## Padrões aplicados

- Guard + validação Zod + helpers de resposta na rota; service puro sobre dados:

```ts
const parsed = CreateAgendamentoSchema.safeParse(await req.json())
if (!parsed.success) return badRequest(JSON.stringify(parsed.error.flatten().fieldErrors))
const agendamento = await agendamentosService.criarAgendamento(parsed.data, session.sub, tenantId)
```

- `criadoPorId`/`atualizadoPorId` sempre do JWT (`session.sub`), nunca do body.
- Unidade ativa multi-tenant via `resolveActiveTenantId` (admin_multi opera na unidade do slug atual; para usuários comuns o header é ignorado se não for o próprio tenant).

## Observações e cuidados

- **`atualizarStatusAgendamento` não tem filtro de tenant** — o `update` é por `id` puro. Qualquer role permitido pode alterar agendamento de outro tenant se souber o UUID. Divergência da regra de isolamento do CLAUDE.md.
- `viewer`/`admin_multi` podem **escrever** (POST/PATCH) — coerente com viewer = alias legado de admin_multi, mas contradiz a matriz "viewer é read-only" do CLAUDE.md.
- `POST` e `PATCH` retornam `forbidden()` (403) quando não autenticado, em vez de `unauthorized()` (401); `badRequest` recebe `JSON.stringify(...)` (o erro chega como string JSON dupla-encodada, diferente das demais rotas).
- `assertSistema` **lança** exceção fora do try/catch da rota — usuário com `sistemas` preenchido sem `linensistem` produz um 500 genérico do Next, não um 403 limpo.
- `tenantId` é nullable no modelo (registros legados e criados por super_admin sem unidade ativa ficam com `null` e só aparecem na listagem cross-tenant do super_admin).
- Não há paginação nem limite na listagem.
