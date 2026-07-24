# Plano de Desenvolvimento — Chamados de Manutenção

> Feature nova: painel de chamados de manutenção (abrir → assumir/atribuir → finalizar),
> com prioridade, prazo/SLA, campos fiscais restritos a admin e dashboard gerencial.
> Segue o padrão DDD em camadas do projeto (route → module/service → Prisma).

---

## 1. Decisão de arquitetura — "faz sentido colocar backend nessa parte?"

**Sim, com backend — mas dentro do próprio Next.js, não como serviço separado.**

O projeto **já tem backend**: a arquitetura em camadas (`route.ts` → `modules/*.service.ts` → Prisma)
é o backend. Chamados serão um novo domínio `modules/chamados` seguindo exatamente esse padrão.

Descartado: backend separado (NestJS/Express). No tamanho atual traria só custo (outro deploy,
duplicar JWT/CORS, saltos de rede) e quebraria a consistência com todos os outros módulos.
Escalabilidade se resolve reforçando fronteiras de camada e dividindo serviços por
responsabilidade (query/command) — não fatiando um servidor à parte.

---

## 2. Decisões de produto (confirmadas)

| Tema | Decisão |
|------|---------|
| Origem | Nativos. Criados por **admin ou operador** no app. Vínculo opcional a bem/patrimônio do Trílogo. Sem sync do ERP. |
| Criação | Formulário com os dados do chamado **+ seleção de ambiente** reusando a UI de ronda. |
| Responsável | Quem **assume** vira responsável (usuário logado). Admin pode **atribuir** a outro usuário. |
| Prazo/SLA | Cada chamado tem `prazo`. **"Atrasado" é derivado** (status aberto/em execução e `prazo < agora`). |
| Finalização | Qualquer usuário com escrita finaliza pelo painel, reusando a **tela de ocorrência** (descrição + foto). |
| Campos fiscais | `fornecedor`, `nº ordem de compra`, `valor gasto`: **só admin escreve e só admin vê**. |
| Dashboard | Igual à aba 1 da planilha: totais, por status/prioridade/tipo/responsável, valor gasto. Admin only. |
| Testes | **Vitest** (regras/serviços/schemas) + **Playwright** (E2E do fluxo). |

---

## 3. Ciclo de vida do chamado

```
                 (admin atribui na criação)
                          │
   criar ─────────────────┼─────────────► ABERTO ──── assumir ────► EM_EXECUCAO ──── finalizar ────► FINALIZADO
   (operador/admin)       │                 │           (vira        (responsável       (reusa UI
   preenche dados +       └──► (atribuído)   │          responsável)   definido)         ocorrência)
   seleciona ambiente                        │
                                             └──── (admin) cancelar ──► CANCELADO

   ATRASADO = estado derivado (status ∈ {aberto, em_execucao} E prazo < agora) — não é coluna.
```

Status persistidos: `aberto` · `em_execucao` · `finalizado` · `cancelado`.

---

## 4. Modelo de dados (Prisma)

Um único domínio → **uma migration** (`add_chamados`). Nunca misturar com outros modelos.

```prisma
model Chamado {
  id                   String    @id @default(uuid())
  numero               Int       @unique @default(autoincrement())  // código legível (#123)
  tenantId             String
  criadoPorId          String

  titulo               String
  descricao            String
  tipo                 String    // 'eletrica'|'hidraulica'|'civil'|'climatizacao'|'gases'|...
  prioridade           String    @default("media")  // 'baixa'|'media'|'alta'|'urgente'
  status               String    @default("aberto")  // 'aberto'|'em_execucao'|'finalizado'|'cancelado'
  projeto              String?
  prazo                DateTime

  // Ambiente (snapshot — preserva histórico se o ambiente for removido)
  ambienteId           String?
  ambienteNomeSnapshot String?
  blocoNomeSnapshot    String?

  // Bem do Trílogo (opcional)
  trilogoAssetId       Int?
  patrimony            String?
  descricaoBemSnapshot String?

  // Atribuição / responsável
  responsavelId        String?
  atribuidoPorId       String?
  assumidoEm           DateTime?

  // Execução / finalização (reusa payload da ocorrência)
  descricaoExecucao    String?
  fotoExecucao         String?    // base64 (~1.5MB, mesmo teto do projeto)
  observacaoFinal      String?
  finalizadoEm         DateTime?
  finalizadoPorId      String?

  // Campos fiscais — SOMENTE admin escreve/lê (nunca retornados a não-admin)
  fornecedor           String?
  numeroOrdemCompra    String?
  valorGastoCentavos   Int?       // centavos (evita float em moeda)

  // Auditoria (padrão do projeto)
  criadoEm             DateTime  @default(now())
  atualizadoEm         DateTime  @updatedAt
  atualizadoPorId      String?

  ambiente             AmbienteTenant? @relation(fields: [ambienteId], references: [id], onDelete: SetNull)
  criadoPor            Usuario   @relation("ChamadoCriadoPor",   fields: [criadoPorId],   references: [id])
  responsavel          Usuario?  @relation("ChamadoResponsavel", fields: [responsavelId], references: [id])
  tenant               Tenant    @relation(fields: [tenantId], references: [id])

  @@index([tenantId, status])
  @@index([tenantId, prioridade])
  @@index([tenantId, prazo])
  @@index([responsavelId, status])
  @@map("chamados")
}
```

Relações inversas a adicionar (Prisma exige os dois lados):
- `Usuario`: `chamadosCriados Chamado[] @relation("ChamadoCriadoPor")`, `chamadosResponsavel Chamado[] @relation("ChamadoResponsavel")`
- `Tenant`: `chamados Chamado[]`
- `AmbienteTenant`: `chamados Chamado[]`

**Decisão em aberto (não bloqueia):** finalização como campos no próprio `Chamado` (1 relato) vs.
tabela filha `ChamadoItem[]` (múltiplos relatos por chamado, espelhando `OcorrenciaDetalhe`).
Recomendação: começar com campos no `Chamado` (1 relato basta para um chamado). Reavaliar se
surgir necessidade de N itens.

---

## 5. Matriz de permissões (não-negociável)

| Ação | operator / operator_patrimonio | tenant_admin | super_admin | viewer |
|------|:-----------------------------:|:------------:|:-----------:|:------:|
| Listar chamados (painel) | ✅ (do tenant) | ✅ | ✅ (cross) | ✅ leitura |
| Criar chamado | ✅ | ✅ | ✅ | ❌ |
| Assumir (vira responsável) | ✅ | ✅ | ✅ | ❌ |
| Atribuir a outro usuário | ❌ | ✅ | ✅ | ❌ |
| Finalizar | ✅ | ✅ | ✅ | ❌ |
| Cancelar | ❌ | ✅ | ✅ | ❌ |
| Ver/editar campos fiscais | ❌ (nem lê) | ✅ | ✅ | ❌ |
| Dashboard | ❌ | ✅ (do tenant) | ✅ (global) | ✅ leitura |

Regras codificadas como **funções puras** em `chamados.rules.ts` (fáceis de testar):
`podeAssumir`, `podeAtribuir`, `podeFinalizar`, `podeEditarFiscal`, `transicaoValida(de, para)`,
`ehAdmin(role)`, `sanitizarParaRole(chamado, role)` (remove campos fiscais para não-admin).

Isolamento de tenant via `tenantFilter({ tenantId, tenantIds })` em **toda** query.
`criadoPorId`/`responsavelId`/`role` **sempre do JWT**, nunca do body.

---

## 6. Camadas & arquivos a criar

### Servidor (`src/modules/chamados/`)
| Arquivo | Conteúdo |
|---------|----------|
| `chamados.types.ts` | Schemas Zod: `CriarChamadoSchema`, `AtribuirChamadoSchema`, `FinalizarChamadoSchema`, `EditarFiscalSchema`, constantes `TIPOS_CHAMADO`, `PRIORIDADES`, `STATUS`. |
| `chamados.rules.ts` | Funções puras de permissão/transição (§5) + derivação de `atrasado`. |
| `chamados-query.service.ts` | Leitura: `listar` (filtros status/prioridade/tipo/responsável), `buscar`, `buscarFoto`, `dashboard`. Sempre `sanitizarParaRole`. |
| `chamados-command.service.ts` | Escrita: `criar`, `assumir`, `atribuir`, `finalizar`, `cancelar`, `editarFiscal`. Usa `$transaction` onde há múltiplos passos. |

### API (`src/app/api/chamados/`)
| Rota | Métodos / roles |
|------|-----------------|
| `route.ts` | `GET` listar (todos os roles, viewer inclui) · `POST` criar (escrita, sem viewer) |
| `[id]/route.ts` | `GET` detalhe · `PATCH` editar (roteia p/ fiscal se admin) |
| `[id]/assumir/route.ts` | `POST` assumir |
| `[id]/atribuir/route.ts` | `POST` atribuir (admin) |
| `[id]/finalizar/route.ts` | `POST` finalizar |
| `[id]/cancelar/route.ts` | `POST` cancelar (admin) |
| `[id]/foto/route.ts` | `GET` foto de execução (lazy) |
| `dashboard/route.ts` | `GET` dashboard (admin/viewer) |

Todas com `verifyAuthDetailed(req, [roles])`, respostas via `lib/api-response`, validação `safeParse`.

### Cliente (`src/services/` e `src/hooks/`)
| Arquivo | Conteúdo |
|---------|----------|
| `services/chamados.service.ts` | Wrappers fetch sobre `@/services/api` + tipos de resposta. |
| `hooks/useChamados.ts` | Lista + filtros + mutations (criar/assumir/atribuir/finalizar/cancelar/fiscal) via TanStack Query. |
| `hooks/useChamadoForm.ts` | Estado do formulário de criação (dados + seleção de ambiente). Reusa `buscarBlocos`. |

### UI (`src/app/[tenantSlug]/chamados/`)
| Página/componente | Reuso |
|-------------------|-------|
| `page.tsx` (painel) | Lista de chamados abertos, filtro por prioridade/status, botões assumir/finalizar. Cards no estilo `RondaCard`/`TicketRow`. |
| `novo/page.tsx` | Máquina de etapas (estilo `manutencao/realizar`): dados → **`ListaBlocos`/`ListaLocais`** (ambiente) → confirmar. Admin: campo atribuir. |
| `[id]/finalizar` (etapa/modal) | Reusa **`OcorrenciaDetalhe`** + **`FotoCapture`**/`arquivoParaBase64Comprimido`. |
| Campos fiscais | Bloco visível só quando `role ∈ {tenant_admin, super_admin}`. |
| `src/app/admin/chamados/page.tsx` | Dashboard (Recharts) espelhando a aba 1 da planilha. |

**Componentes reutilizados sem reescrever:** `ListaBlocos`, `ListaLocais`, `OcorrenciaDetalhe`,
`FotoCapture`, `arquivoParaBase64Comprimido`, `Card`, `Button`, `Text`, `me/blocos` endpoint.

---

## 7. Dashboard (admin) — espelha a planilha

Uma query agregada (padrão `dashboard.service.ts`, sem N+1) retornando:
- **Totais:** total, executados, em execução, **atrasados** (derivado), valor gasto (soma, só admin).
- **Por status / prioridade / tipo / responsável:** `groupBy` com `_count`.
- Filtro por período (`criadoEm`) e tenant (super_admin vê global via `tenantFilter`).

---

## 8. Estratégia de testes

Infra hoje: **nenhuma**. Fase 0 instala tudo.

### Vitest (unitário + integração da camada de serviço)
- **Regras puras (`chamados.rules.ts`)** — maior valor, sem I/O:
  - transições de status válidas/ inválidas; `atrasado` na virada do prazo;
  - `podeAtribuir` só admin; `podeFinalizar` bloqueia viewer;
  - `sanitizarParaRole` remove `fornecedor/valor/ordem` para não-admin.
- **Schemas Zod** — limites (foto ≤ ~2MB, prioridade/tipo válidos, prazo obrigatório).
- **Serviços** — com Prisma mockado (`vitest-mock-extended`) ou DB de teste: `assumir` grava
  responsável do JWT; `criar` ignora `criadoPorId` do body; isolamento de tenant no `where`.

### Playwright (E2E — fluxo real no navegador)
1. Operador cria chamado (dados + ambiente) → aparece no painel como `aberto`.
2. Operador assume (seleciona prioridade) → vira `em_execucao`, responsável = ele.
3. Operador finaliza (descrição + foto reusando UI de ocorrência) → `finalizado`.
4. Admin edita fornecedor/valor → operador **não** vê esses campos.
5. Admin abre dashboard → contadores batem (inclui atrasado).

Setup: usuário-seed por role, DB de teste isolada, `webServer` do Playwright subindo `next dev`.

### Scripts a adicionar em `package.json`
`test` (vitest run) · `test:watch` · `test:e2e` (playwright test) · `test:e2e:ui`.

---

## 9. Plano faseado (com checkpoints)

| Fase | Entrega | Testes / checkpoint |
|------|---------|---------------------|
| **0. Infra de testes** | Vitest + Playwright configurados, 1 teste smoke passando, scripts npm. | `npm test` e `npm run test:e2e` rodam verdes vazios. |
| **1. Domínio + banco** | Migration `add_chamados`, relações inversas, `chamados.types.ts`, `chamados.rules.ts`, serviços query/command. | **Vitest**: rules + schemas + serviços. `prisma migrate` aplica limpo. |
| **2. API** | Todas as rotas de §6 com roles e validação. | **Vitest** de integração das rotas (permissão/tenant). `tsc` e `lint` limpos. |
| **3. Cliente** | `services/chamados.service.ts`, `useChamados`, `useChamadoForm`. | Typecheck; smoke manual das queries. |
| **4. UI operador** | Painel + criar (com ambiente) + assumir + finalizar (reuso ocorrência). | Fluxo manual ponta a ponta no navegador (`/verify`). |
| **5. UI admin** | Atribuir, campos fiscais restritos, dashboard. | Conferir ocultação de campos fiscais para operador. |
| **6. E2E + polish** | Cenários Playwright de §8, ajustes de UX, índices revisados. | **Playwright** verde; revisão de código (`/code-review`). |

Cada fase é um commit isolado em `feature/chamados-manutencao` (branch nova a partir de `main`).

---

## 10. Riscos & pontos de atenção

- **`numero @autoincrement`** é global (não por tenant) — ok para código legível `#123`. Se precisar
  sequência por tenant, muda para cálculo em `$transaction`.
- **Campos fiscais** nunca podem vazar: `sanitizarParaRole` no serviço de leitura + teste dedicado.
- **Foto base64** no Postgres (padrão do projeto) — comprimir no cliente (1280px/0.7) antes de enviar.
- **"Atrasado" derivado** exige comparar `prazo` com `agora` na query do dashboard (não filtrar em memória).
- **Rate limiting**: criação é autenticada (menos crítico), mas seguir o TODO de rate limit do projeto.
- **viewer**: garantir read-only em todas as rotas de escrita (guardas + teste).

---

## 11. Fora de escopo (v1)

- Sync/importação de chamados do ERP Trílogo.
- Notificações (e-mail/push) de atribuição ou vencimento de SLA.
- Anexos múltiplos / histórico de comentários por chamado.
- Reabertura de chamado finalizado.
