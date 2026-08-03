# Módulo `rodadas`

> Inspeção de gases medicinais (fluxo original): rodadas com medições de O2/ar por ambiente, abastecimento de cilindros e alterações com foto.

## Responsabilidade

Ciclo de vida da rodada de inspeção de gases: criar, registrar ambientes inspecionados (pureza/pressões de O2, pressão de ar, backup, abastecimento, alteração) e finalizar. Usa tabelas próprias (`rodadas`, `ambientes_inspecionados`, `abastecimentos`, `alteracoes`).

**Atenção:** existe um segundo fluxo de gases, mais novo, dentro do módulo `rondas` (`RegistroAmbiente.tipoRegistro = 'gases'`), usado pelo fluxo unificado de ronda por blocos (`useRondaBase`). Este módulo atende o fluxo dedicado `/[tenantSlug]/inspecao` via `useInspecao`. Os dois coexistem e gravam em tabelas diferentes.

## Arquivos

| Arquivo | Papel |
|---------|-------|
| `rodadas.service.ts` | Todas as queries Prisma: CRUD da rodada, registro de ambiente com nested create de abastecimento/alteração, busca de foto |

Não há `rodadas.types.ts` — o schema Zod do registro de ambiente vive **dentro da rota** `api/rodadas/[id]/ambientes/route.ts` (divergência, ver Observações). O service exporta a interface `RegistrarAmbienteInput`.

## Funções públicas

| Função | Assinatura | Descrição |
|--------|-----------|-----------|
| `listarRodadas` | `(tenantId: string \| null, limit = 50, tenantIds?: string[])` | Lista rodadas com ambientes + abastecimento + alteração (sem foto); filtro via `tenantFilter` |
| `criarRodada` | `(tenantId: string, criadoPorId: string)` | Cria a rodada vazia |
| `finalizarRodada` | `(id: string)` | Seta `finalizadoEm = now()` — **sem filtro de tenant** (ver Observações) |
| `registrarAmbienteRodada` | `(rodadaId: string, input: RegistrarAmbienteInput)` | Cria `AmbienteInspecionado` + nested create condicional de `Abastecimento` (se `temAbastecimento`) e `Alteracao` (se `temAlteracao`) |
| `buscarFotoAlteracao` | `(ambienteInspecionadoId: string): Promise<string \| null>` | `findUnique` em `Alteracao` pelo unique `ambienteInspecionadoId`, `select { foto }` |

`RegistrarAmbienteInput`: `{ ambiente, purezaO2, pressaoO2, pressaoAr, backupLigado, temAbastecimento, temAlteracao, abastecimento?: { quantidade, tamanho } | null, alteracao?: { tipo, descricao, foto?, trilogoChamado } | null }`.

## Modelos de banco

| Modelo | Tabela | Campos-chave | Índices |
|--------|--------|--------------|---------|
| `Rodada` | `rodadas` | `iniciadoEm`, `finalizadoEm?`, `tenantId`, `criadoPorId` | `[tenantId]`, `[tenantId, iniciadoEm]` |
| `AmbienteInspecionado` | `ambientes_inspecionados` | `rodadaId`, `ambiente` (texto), `purezaO2/pressaoO2/pressaoAr Float`, `backupLigado`, `temAbastecimento`, `temAlteracao`, `concluidoEm` | nenhum (nem em `rodadaId`) |
| `Abastecimento` | `abastecimentos` | `ambienteInspecionadoId @unique`, `quantidade Int`, `tamanho` | unique implícito |
| `Alteracao` | `alteracoes` | `ambienteInspecionadoId @unique`, `tipo`, `descricao`, `foto?` (base64), `trilogoChamado` | unique implícito |

## Rotas de API que usam este módulo

| Rota | Auth real | O que faz |
|------|-----------|-----------|
| `GET /api/rodadas` | `getSession()` — qualquer usuário autenticado, sem lista de roles | Lista rodadas (`super_admin` → cross-tenant com `tenantId: null`) |
| `POST /api/rodadas` | `getSession()`; `super_admin` recebe `badRequest` | Cria rodada com `session.tenantId` e `session.userId` |
| `PATCH /api/rodadas/[id]` | `getSession()`; `super_admin` → `forbidden` | Finaliza a rodada — sem conferir se ela pertence ao tenant da sessão |
| `POST /api/rodadas/[id]/ambientes` | **nenhuma — rota sem autenticação** | Valida com Zod inline e registra o ambiente inspecionado |
| `GET /api/ambientes/[id]/foto` | **nenhuma — rota sem autenticação** | Retorna `{ foto }` da `Alteracao` pelo id do ambiente inspecionado, ou 404 |

Obs.: `GET /api/ambientes/[id]/foto` apesar do caminho **não** usa o módulo `ambientes` — importa `buscarFotoAlteracao` deste módulo.

## Consumo no client

- `src/services/rodadas.service.ts` — `listar()`, `criar()`, `finalizar(id)`, `registrarAmbiente(id, body)`; tipos em `src/services/inspecao.types.ts` (`RodadaInspecao`).
- Hook `src/hooks/useInspecao.ts` (página `/[tenantSlug]/inspecao`): wizard por etapas (medições → backup → abastecimento → alteração → trilogo). Cria a rodada lazy no primeiro `salvarAmbiente`, registra 1 ambiente (nome = `tenantSlug.toUpperCase()`) e finaliza em seguida — na prática cada rodada tem um único ambiente. **Não usa draft** (`RondaDraft` é exclusivo do módulo `rondas`).
- Componentes `src/components/ui/inspecao/` (`RodadaCard`, `AmbienteCard`, `FotoLazyAmbiente`) — `FotoLazyAmbiente` busca `GET /api/ambientes/[id]/foto` sob demanda (IntersectionObserver).

## Padrões aplicados

- **Isolamento por tenant (leitura):** `const where = tenantFilter({ tenantId, tenantIds })` em `listarRodadas`.
- **Nested create condicional** (o "quase-transação" do módulo — um único `create` atômico, sem `$transaction` explícito):

```ts
...(input.temAlteracao && input.alteracao
  ? { alteracao: { create: { tipo, descricao, foto: input.alteracao.foto ?? null, trilogoChamado } } }
  : {}),
```

- **Zod na borda:** `RegistrarAmbienteSchema.safeParse(await req.json())` (schema inline na rota).
- **Fotos base64 + lazy loading:** foto opcional na `Alteracao`; carregada só sob demanda via `FotoLazyAmbiente`.
- **Erros:** `console.error('[rodadas.service] fn:', error)` + rethrow; rotas respondem com helpers (`ok`, `created`, `badRequest`, `serverError`).

## Observações e cuidados

- **Fluxo legado vs. novo:** a inspeção de gases "por blocos" atual passa pelo módulo `rondas` (tabela `registros_ambientes` com `tipoRegistro: 'gases'`). Ao consultar histórico de gases, verifique as **duas** origens.
- **Divergências de segurança:** `POST /api/rodadas/[id]/ambientes` e `GET /api/ambientes/[id]/foto` não têm nenhum guard de auth; `PATCH /api/rodadas/[id]` finaliza qualquer rodada por id sem checar tenant (`finalizarRodada(id)` não recebe `tenantId`). Tudo viola as regras "auth em toda rota protegida" e "tenant isolation" do CLAUDE.md.
- **Divergências de padrão:** rotas usam `getSession()` (`@/lib/auth`) em vez de `verifyAuth`/`verifyAuthDetailed` com lista de roles; o schema Zod vive na rota, não em `.types.ts`; a sessão aqui expõe `userId` (não `sub`); as rotas ainda não conhecem `admin_multi`/unidade ativa (`x-tenant-id`).
- **Sem validação de tamanho de foto:** o Zod da rota usa `foto: z.string()` sem `.max(2_000_000)` — o limite de ~1,5 MB documentado só existe no módulo `rondas`.
- **Sem expiração:** diferentemente das rondas (24h + `prisma/scripts/expirar-rondas.ts`), rodadas abertas nunca expiram automaticamente; existe apenas o script destrutivo `prisma/scripts/clear-rodadas.ts`.
- `AmbienteInspecionado` não tem índice em `rodadaId` (o CLAUDE.md pede índice mínimo por FK/tenant).
