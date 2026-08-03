# Módulo `chamados`

> Chamados de manutenção predial/patrimonial: abertura, atribuição, execução, finalização, cancelamento, painel gerencial e importação automática de tickets do Trílogo — com regras puras testadas e separação command/query.

## Responsabilidade

Ciclo de vida completo de chamados (`aberto → em_execucao → finalizado|cancelado`) por tenant: snapshot de
ambiente/bloco/bem na abertura, vínculo opcional a bem do Trílogo, campos fiscais restritos a admin, atraso
derivado (nunca persistido) e dashboard agregado no banco. Desde a unificação (ver `UNIFICACAO_CHAMADOS_PLAN.md`
na raiz), também converte e importa tickets do Trílogo como chamados (insert-only, com fila de triagem).

## Arquivos

| Arquivo | Papel |
|---|---|
| `chamados.rules.ts` | Regras puras (sem I/O): roles, transições de status, atraso, sanitização fiscal |
| `chamados.types.ts` | Constantes de domínio, schemas Zod de toda fronteira de API, shapes de retorno (client-safe) |
| `chamados-command.service.ts` | Escritas (criar, assumir, atribuir, finalizar, cancelar, editarFiscal) via Prisma |
| `chamados-query.service.ts` | Leituras (listar, buscar, buscarFotos, dashboard) via Prisma |
| `chamados-trilogo.ts` | Conversão pura ticket Trílogo → chamado (status/prioridade/tipo/título) e resolução da unidade |
| `chamados-sync.service.ts` | Sincronização insert-only dos tickets (fetch, dedupe, lotes, fila de triagem) |
| `chamados.rules.test.ts` / `chamados.types.test.ts` | Testes das regras puras e dos schemas Zod |
| `chamados-command.service.test.ts` / `chamados-query.service.test.ts` | Testes com Prisma mockado (forma dos `where`/`data`) |
| `chamados-trilogo.test.ts` / `chamados-sync.service.test.ts` | Testes da conversão de tickets e da sincronização |

## Funções públicas

| Função | Assinatura real | Descrição |
|---|---|---|
| `criar` | `criar(tenantId, criadoPorId, input: CriarChamadoInput, atribuicao?: { responsavelId; atribuidoPorId }): Promise<ChamadoOperado>` | Cria com snapshot de ambiente/bloco; atribuição direta (admin) nasce `em_execucao` |
| `assumir` | `assumir(id, escopo: EscopoTenant, userId, input: AssumirChamadoInput): Promise<ChamadoOperado \| null>` | Quem assume vira responsável; só a partir de `aberto`; atômico via `updateMany` condicional |
| `atribuir` | `atribuir(id, escopo, adminId, input: AtribuirChamadoInput): Promise<ChamadoOperado \| null>` | Admin define/troca responsável em chamado vivo; valida responsável no tenant DO CHAMADO |
| `finalizar` | `finalizar(id, escopo, userId, input: FinalizarChamadoInput): Promise<ChamadoOperado \| null>` | A partir de `aberto`/`em_execucao`; sem responsável, quem finaliza vira responsável |
| `cancelar` | `cancelar(id, escopo, adminId, motivo?: string): Promise<ChamadoOperado \| null>` | Admin cancela chamado vivo; motivo opcional em `motivoCancelamento` |
| `editarFiscal` | `editarFiscal(id, escopo, adminId, input: EditarFiscalInput): Promise<ChamadoOperado \| null>` | Patch parcial dos campos fiscais |
| `listar` | `listar(escopo, role, filtros?: FiltrosChamados): Promise<ChamadoListaItem[]>` | Vivos (até 200, por prazo) + terminais (até 100, mais recentes primeiro) em duas queries; sem fotos; fiscais sanitizados |
| `buscar` / `buscarFotos` | `(id, escopo, [role])` | Detalhe sanitizado / fotos base64 sob demanda |
| `dashboard` | `dashboard(escopo, periodo?: { de?; ate? }, tenantId?: string): Promise<DashboardChamados>` | Agregações via `groupBy`/`aggregate`; `tenantId` restringe por AND dentro do escopo |
| `sincronizarChamadosTrilogo` | `sincronizarChamadosTrilogo(inicio: string, fim: string, simular = false): Promise<ResultadoSync>` | Importa tickets da janela `YYYY-MM-DD`; insert-only; recusas vão para `TicketTrilogoTriagem` |
| `janelaPadrao` | `janelaPadrao(dias = 7, agora?: Date): { inicio; fim }` | Janela móvel da sincronização (o cron usa 365 dias) |
| `converterTicket` / `resolverTenant` / `mapearStatus` / `mapearPrioridade` / `mapearTipo` / `mapearTitulo` | (puras, em `chamados-trilogo.ts`) | Tradução ticket → chamado e decisão de qual tenant recebe o ticket |

`EscopoTenant = { tenantId: string | null; tenantIds?: string[] }` — sempre via `escopoSessao(session)` na rota.

## Regras de negócio (extraídas do código e dos testes)

- **Roles**: leitura = `super_admin, tenant_admin, admin_multi, operator, operator_patrimonio, viewer`; escrita (operar/assumir/finalizar) = os mesmos menos `viewer`; **criação** (`ROLES_CRIACAO_CHAMADOS`) NÃO inclui `operator` — ele só executa; admin = `super_admin, tenant_admin, admin_multi`. `viewer` (nome legado de `admin_multi`) segue congelado como leitura em chamados — os testes registram que a paridade total exige o rename no banco.
- **Só admin** atribui, cancela e edita campos fiscais.
- **Transições** (`transicaoValida`, testadas): `aberto → em_execucao|finalizado|cancelado`; `em_execucao → finalizado|cancelado`; terminais não saem; `em_execucao` não volta a `aberto`. Enforcement real: `where` condicional do `updateMany` (corrida entre dois "assumir" premia só um; `count === 0 → null → 409`).
- **Atraso derivado** (`estaAtrasado`): status vivo com `prazo < agora`; **prazo `null` nunca atrasa** (ticket do Trílogo pode não ter deadline); exatamente no prazo não atrasa.
- **Campos fiscais**: `sanitizarParaRole` remove `fornecedor`/`numeroOrdemCompra`/`valorGastoCentavos` de toda leitura não-admin.
- **Responsável válido**: usuário ativo, do tenant do chamado, com role em `ROLES_ESCRITA_CHAMADOS`.
- **Finalizar sem dono vira dono**; responsável já definido nunca é sobrescrito (testado).
- **Zod**: 3 tipos (`eletrica|hidraulica|patrimonio` — `civil`/`outros` removidos); bem exige `trilogoAssetId`+`patrimony` juntos; foto ≤ 2.000.000 chars (~1,5 MB); `tenantId`/`criadoPorId` injetados são descartados (strip); filtro `atrasados`/`comBem` só ligam com `'true'`.
- **Filtro de unidade restringe, nunca amplia**: `filtros.tenantId` entra por `AND` com `tenantFilter(escopo)` — spread deixaria a query string sobrescrever o tenant da sessão (comentário explícito no código; vale para `listar` e `dashboard`).
- **Importação Trílogo** (`chamados-trilogo.ts`, insert-only): status mapeado por texto real da API (`Executado→finalizado`, `Em Execução→em_execucao`, `Arquivado/Cancelado→cancelado`; desconhecido cai em `aberto` de propósito); **`em_execucao` importado vira `aberto`** (o responsável do Trílogo não é usuário daqui e `assumir` exige `aberto`); prioridade fora da faixa cai em `media`; tipo sai de regex sobre `buildingServiceTypeDescription` (resto cai em `patrimonio`); ticket sem id/descrição/data de criação é **recusado** para triagem (nunca entra pela metade); sem deadline entra com `prazo null`.
- **Resolução da unidade** (`resolverTenant`): projeto configurado > nome/slug do tenant no endereço > companyId com tenant único; empate = ambiguidade → triagem. Usa as mesmas funções de `modules/trilogo/escopo` que recortam a leitura — divergir importaria ticket para unidade que não pode vê-lo.

## Modelos de banco

| Modelo | Tabela | Campos-chave | Índices |
|---|---|---|---|
| `Chamado` | `chamados` | `numero Int @unique autoincrement`, `tenantId`, `criadoPorId`, `titulo`, `tipo`, `prioridade`, `status`, `prazo DateTime?`, snapshots de ambiente/bloco/bem, `trilogoAssetId?`, `trilogoTicketId Int? @unique` (idempotência da importação), `trilogoStatusOrigem?` (texto cru da origem), `fotoAbertura?`/`fotoExecucao?`, `responsavelId?`/`atribuidoPorId?`/`assumidoEm?`, `finalizadoEm?`/`finalizadoPorId?`, `motivoCancelamento?`, fiscais (`valorGastoCentavos Int?` — centavos, nunca float) | `[tenantId, status]`, `[tenantId, prioridade]`, `[tenantId, prazo]`, `[tenantId, criadoEm]`, `[responsavelId, status]` |
| `TicketTrilogoTriagem` | `tickets_trilogo_triagem` | `trilogoTicketId Int @id`, `motivo`, `statusOrigem?`, `descricao?`, `endereco?`, `companyId?`, `ocorrencias` (incrementa a cada recusa), `resolvidoEm?` | `[resolvidoEm, ultimaVezEm]` |

## Rotas de API que usam este módulo

| Método + caminho | Roles (guard real) | O que faz |
|---|---|---|
| `GET /api/chamados` | `ROLES_LEITURA_CHAMADOS` | Lista com filtros (status, prioridade, tipo, responsável, atrasados, tenantId, comBem) |
| `POST /api/chamados` | `ROLES_CRIACAO_CHAMADOS` | Cria; `super_admin` informa `tenantId` no corpo (validado como tenant ativo); `admin_multi` pode informar `tenantId` de unidade que administra (`canScopeTenant` — fora do escopo é 403); demais usam o da sessão e o corpo é ignorado; `responsavelId` só honrado se `podeAtribuir(role)` |
| `GET/PATCH /api/chamados/[id]` | leitura / `ROLES_ADMIN_CHAMADOS` | Detalhe / campos fiscais |
| `POST /api/chamados/[id]/assumir` | `ROLES_ESCRITA_CHAMADOS` | Assume (prioridade opcional); `null` → `conflict` 409 |
| `POST /api/chamados/[id]/atribuir` | `ROLES_ADMIN_CHAMADOS` | Atribui responsável |
| `POST /api/chamados/[id]/finalizar` | `ROLES_ESCRITA_CHAMADOS` | Finaliza (descrição + foto opcional); `null` → 409 |
| `POST /api/chamados/[id]/cancelar` | `ROLES_ADMIN_CHAMADOS` | Cancela com motivo opcional; `null` → 409 |
| `GET /api/chamados/[id]/foto` | `ROLES_LEITURA_CHAMADOS` | Fotos sob demanda |
| `GET /api/chamados/dashboard` | `ROLES_ADMIN_CHAMADOS` | Painel gerencial (`de`, `ate`, `tenantId`) |
| `GET/POST /api/cron/sync-trilogo` | `Authorization: Bearer <CRON_SECRET>` (obrigatório; testado em `route.test.ts`) | Sincroniza ambientes e depois chama `sincronizarChamadosTrilogo` com janela de 365 dias |
| `GET /api/admin/chamados/triagem` | `super_admin` | Lê a fila `TicketTrilogoTriagem` (`?resolvidos=true` inclui resolvidos); sem tela — é a única leitura fora do banco |

Todas as rotas de chamados usam `verifyAuthDetailed` (401 vs 403) e `escopoSessao(session)`.

## Consumo no client

- `src/services/chamados.service.ts` — wrappers fetch (`listar`, `buscar`, `criar`, `assumir`, `atribuir`, `finalizar`, `cancelar`, `editarFiscal`, `buscarFotos`, `dashboard`); reexporta os tipos client-safe de `chamados.types.ts`; `ChamadoResumo.prazo` é `string | null` e expõe `trilogoTicketId`/`trilogoStatusOrigem`.
- `src/hooks/useChamados.ts` — `useChamados({ ehAdmin?, comBlocos? })`, `useFotosChamado(id)`, `useDashboardChamados({ de?, ate?, tenantId? })`.
- Páginas: `src/app/[tenantSlug]/chamados/page.tsx`, `.../chamados/novo/page.tsx`, `src/app/admin/chamados/page.tsx` — importam constantes/regras client-safe direto do módulo.

## Padrões aplicados

- Command/query separados; regras puras isoladas; conversão Trílogo pura e testada sem rede.
- Transição atômica com isolamento de tenant:

```ts
const { count } = await prisma.chamado.updateMany({
  where: { id, status: 'aberto', ...tenantFilter(escopo) },
  data: { status: 'em_execucao', responsavelId: userId, assumidoEm: new Date() },
})
if (count === 0) return null // corrida ou fora do tenant
```

- Filtro de unidade por AND (nunca spread) para não permitir escape de escopo via query string.
- Importação idempotente: `createMany({ skipDuplicates: true })` + índice único em `trilogoTicketId`; lote que falha é reprocessado item a item para isolar a linha inválida.
- Zod `safeParse` em toda rota; fotos base64 fora das listas; helpers de `lib/api-response.ts` (incl. `conflict()`).

## Observações e cuidados

- `Chamado.numero` é autoincrement **global** (`@unique`), não por tenant.
- A sincronização é **insert-only**: atualizar chamados existentes desfaria o trabalho local (a integração é somente leitura; nada volta para o Trílogo). Corrigir mapeamento de status depois = `UPDATE` manual usando `trilogoStatusOrigem`.
- `ResultadoSync.vinculadosSoPorEmpresa > 0` merece conferência: o ticket pode ter ido para o hospital errado e o índice único **impede reimportar corrigido**.
- Chamados importados são assinados por um usuário de sistema (`sistema.trilogo@local`, inativo, `senhaHash: '!'`), criado por upsert na primeira sincronização.
- O comentário do schema Prisma ainda cita `'civil'` como tipo; o domínio só aceita `eletrica|hidraulica|patrimonio`.
- Tickets do tipo "Solicitações" (sem bem vinculado, ~80% do volume) viram chamados de tipo `patrimonio` sem patrimônio — deliberado (comentário em `mapearTipo`).
- No `dashboard`, a busca de nomes de responsáveis não filtra tenant intencionalmente (IDs já escopados) — nunca alargar esse `in`.
- A tabela `TRANSICOES` de `chamados.rules.ts` é especificação executável; o enforcement está nos `where` do command service — manter em sincronia.
- Referência histórica da unificação (decisões, dados de produção que corrigiram o plano): `UNIFICACAO_CHAMADOS_PLAN.md` na raiz do repo.
