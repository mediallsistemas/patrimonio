# Módulo `rondas`

> Ronda de ocorrências: ciclo de vida da ronda (criar, registrar ambientes, finalizar, expirar) + rascunho de auto-recuperação (`RondaDraft`).

## Responsabilidade

Toda a lógica de negócio e queries Prisma das rondas de ocorrência. Uma ronda (`RondaOcorrencia`) agrupa registros de ambiente (`RegistroAmbiente`), que podem conter ocorrências com foto (`OcorrenciaDetalhe`). O mesmo fluxo atende a **inspeção de gases** via `tipoRegistro: 'gases'` (campos `purezaO2`, `pressaoO2`, `pressaoAr`, `backupLigado`, abastecimento de cilindros por tamanho em `CilindroAbastecido`), com foto opcional do relógio de cada medição (`FotoMedicaoGas`) — ver Observações. Inclui também o padrão de rascunho/auto-recuperação por usuário (`ronda-draft.service.ts`).

## Arquivos

| Arquivo | Papel |
|---------|-------|
| `rondas.service.ts` | CRUD da ronda, registro de ambientes, expiração automática (24h), listagem admin |
| `ronda-draft.service.ts` | Persistência do rascunho JSON por `(tenantId, criadoPorId)` — upsert, busca com validação, descarte |
| `rondas.types.ts` | Schemas Zod (`RegistroAmbienteSchema` como discriminated union por `tipoRegistro`; `MEDICOES_GAS`, `MedicaoGasSchema`, `FotosMedicoesSchema`, `CilindroAbastecidoSchema`) e tipos inferidos |
| `rondas.rules.ts` | Regras puras: `fotosMedicoesParaGravar` (fotos de relógio do registro), `cilindrosParaGravar` (cilindros por tamanho, aceitando o formato antigo) e `resumoCilindros` (total e tamanhos para as colunas antigas) |
| `rondas.rules.test.ts` | Testes dos schemas de fotos e cilindros e das três regras |

## Funções públicas

| Função | Assinatura | Descrição |
|--------|-----------|-----------|
| `listarRondas` | `(tenantId: string \| null, limit = 50, criadoPorId?: string, tenantIds?: string[])` | Lista com select "light" (sem foto nas ocorrências); filtra por criador quando informado |
| `buscarRonda` | `(id: string, tenantId: string \| null, tenantIds?: string[])` | Busca uma ronda com ambientes + ocorrências (inclui foto) |
| `criarRonda` | `(tenantId: string, criadoPorId: string)` | Expira rondas velhas, **encerra rondas abertas do próprio usuário** (apaga as sem registros, finaliza as demais) e cria a nova — não devolve mais conflito |
| `finalizarRonda` | `(id: string, tenantId: string \| null, tenantIds?: string[])` | Seta `finalizadoEm = now()`; retorna `null` se não achou no escopo do tenant |
| `registrarAmbiente` | `(rondaId: string, input: RegistroAmbienteInput)` | Cria `RegistroAmbiente` + ocorrências, fotos de relógio e cilindros aninhados (`createMany`); `temAbastecimento`, `qtdCilindros` e `tamCilindro` saem dos cilindros gravados; atualiza `atualizadoEm` da ronda via SQL raw |
| `buscarFotoMedicao` | `(registroId: string, medicao: MedicaoGas, escopo: EscopoLeitura): Promise<string \| null>` | Foto do relógio de uma medição, só se a ronda do registro estiver no escopo de leitura (`filtroEscopo`); `null` sem foto ou fora do escopo |
| `fotosMedicoesParaGravar` | `(input: RegistroAmbienteInput): { medicao, foto }[]` | Em `rondas.rules.ts`: só as medições de gases que vieram com foto, na ordem de `MEDICOES_GAS` |
| `cilindrosParaGravar` | `(input: RegistroAmbienteInput): { tamanho, quantidade }[]` | Em `rondas.rules.ts`: cilindros do abastecimento, um por tamanho (linhas repetidas somam); sem `temAbastecimento`, nenhum. Sem a lista, usa `qtdCilindros` + `tamCilindro` (tela antiga) |
| `resumoCilindros` | `(cilindros): { qtdCilindros, tamCilindro }` | Em `rondas.rules.ts`: total e tamanhos (`"3 m³ + P10"`) para as colunas de `registros_ambientes`; nulos sem cilindros |
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
| `FotoMedicaoGas` | `fotos_medicoes_gases` | `registroId` (FK `onDelete: Cascade`), `medicao` (`purezaO2`\|`pressaoO2`\|`pressaoAr`), `foto` (base64), `criadoEm` | `@@unique([registroId, medicao])` |
| `CilindroAbastecido` | `cilindros_abastecidos` | `registroId` (FK `onDelete: Cascade`), `tamanho` (`P7`…`P50`, `3 m³`, capacidade digitada `2,5 m³`), `quantidade` | `[registroId]` |
| `RondaDraft` | `rondas_draft` | `tenantId`, `criadoPorId`, `estado Json`, `atualizadoEm @updatedAt` | `@@unique([tenantId, criadoPorId])` |

## Rotas de API que usam este módulo

| Rota | Roles (verifyAuthDetailed) | O que faz |
|------|---------------------------|-----------|
| `GET /api/rondas` | `super_admin`, `tenant_admin`, `admin_multi`, `viewer`, `operator` | Lista rondas da **unidade ativa** (`resolveActiveTenantId`; não passa `tenantIds`); operator só vê as próprias via `criadoPorId`; expira rondas velhas antes |
| `POST /api/rondas` | `tenant_admin`, `admin_multi`, `viewer`, `operator` | Cria ronda na unidade ativa; rondas abertas do usuário são encerradas antes (o antigo `409 conflict` prendia o usuário em loop quando o draft já tinha sido descartado) |
| `PATCH /api/rondas/[id]` | `super_admin`, `tenant_admin`, `admin_multi`, `viewer`, `operator` | Finaliza a ronda (escopada por unidade ativa + `tenantIds`) |
| `POST /api/rondas/[id]/ambientes` | `super_admin`, `tenant_admin`, `admin_multi`, `viewer`, `operator` | Valida com `RegistroAmbienteSchema`, checa ronda aberta (409 se finalizada), registra ambiente (nos de gases: `fotosMedicoes` e `cilindros` opcionais) |
| `GET /api/rondas/registros/[registroId]/fotos/[medicao]` | `super_admin`, `tenant_admin`, `admin_multi`, `viewer`, `operator` | Foto do relógio de uma medição, sob demanda, no `escopoLeitura(session)`; 400 para medição inválida, 404 sem foto ou de outra unidade |
| `GET/PUT/DELETE /api/rondas/draft` | `super_admin`, `tenant_admin`, `admin_multi`, `viewer`, `operator` | Busca / upsert / descarta o draft; tenant do draft = `resolveActiveTenantId(...) ?? SUPER_ADMIN_TENANT` |
| `POST /api/rondas/expirar` | header `x-cron-secret` = `CRON_SECRET` (`timingSafeEqual`, sem JWT) | Executa `expirarRondasAbertas()` via cron |
| `GET /api/admin/rondas` | `super_admin`, `tenant_admin`, `admin_multi`, `viewer` | Listagem admin via `escopoLeitura(session)`: super_admin global; demais recebem `tenantIds` do escopo (1 ou N); escopo vazio → `ok([])` |

O role `admin_multi` (e seu alias legado `viewer`) opera em várias unidades: a "unidade ativa" vem do header `x-tenant-id`, aceito apenas se `canScopeTenant(session, id)` confirmar acesso (`@/modules/auth/tenant-filter`).

## Consumo no client

- `src/services/rondas.service.ts` — `listar`, `criar`, `finalizar`, `registrarAmbiente`, `buscarDraft`, `salvarDraftAPI`, `descartarDraftAPI`, `buscarBlocos` (via `/api/me/blocos`), `buscarFotoOcorrencia`, `buscarFotoMedicao`.
- Fotos do relógio: `components/ui/ronda/CampoMedicaoGas.tsx` (câmera ou galeria ao lado do rótulo de cada medição, nos dois `GasesMedicoes`) e `components/ui/ronda/MedicoesGasesRonda.tsx` (valores, abastecimento e "Foto" sob demanda na ronda selecionada dos quatro históricos: operador, `/ocorrencias`, admin e viewer).
- Cilindros: `components/ui/ronda/CilindrosAbastecimento.tsx` (linhas de tipo de cilindro + quantidade, nos dois `GasesAbastecimentoDetalhe`); catálogo pré-cadastrado de tipos, validação e o que vai para a API em `src/utils/cilindros.ts`.
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
- **Foto base64:** `foto: z.string().max(2_000_000)` (~1,5 MB), o mesmo teto nas fotos de relógio (`FotosMedicoesSchema`); lazy load no client com `FotoLazy.tsx` (ocorrência) e `MedicoesGasesRonda.tsx` (relógio).
- **Erros:** `console.error('[rondas.service] fn:', error)` + rethrow; rotas devolvem `serverError('...')` sem detalhes.
- **`criadoPorId` sempre do JWT** (`session.sub`), nunca do body.

## Observações e cuidados

- **Tabela compartilhada:** `RegistroAmbiente.tipoRegistro` (`ocorrencia`|`gases`) faz a ronda de ocorrências e a inspeção de gases nova coexistirem na mesma tabela — campos de gases são nullable. Não confundir com o módulo `rodadas` (fluxo de gases legado, tabelas próprias).
- **Fotos do relógio fora de `registros_ambientes`:** `INCLUDE_AMBIENTES` (detalhe) usa `include` e traria qualquer coluna nova de base64 junto. Por isso a foto mora em `fotos_medicoes_gases`, e as listagens (`SELECT_RONDA_LIGHT`, `listarRondasAdmin`) trazem só os valores e **quais** medições têm foto (`SELECT_GASES_LISTA`) — a imagem vem por `buscarFotoMedicao`, quando alguém pede para ver. No client, o draft carrega as fotos (`DraftEstado.fotosMedicoes`, opcional para drafts antigos) só até o ambiente ser registrado; depois o campo é zerado.
- **Abastecimento por tamanho:** a unidade pode receber cilindros de vários tamanhos no mesmo registro, então o detalhe vive em `cilindros_abastecidos` (uma linha por tamanho). `qtdCilindros` (total) e `tamCilindro` (tamanhos, `"3 m³ + P10"`) continuam preenchidos como resumo. Os registros anteriores à tabela só têm essas duas colunas — o histórico (`MedicoesGasesRonda`) lê as duas formas. O servidor ainda aceita o formato de um tamanho só (`qtdCilindros` + `tamCilindro`), que uma tela aberta antes do deploy envia. No draft, `cilindros` é opcional e `abastecimento` (um tamanho) só é lido de drafts antigos (`cilindrosDoDraft`).
- **Expiração (24h):** três gatilhos — inline em `GET /api/rondas`, `criarRonda` e `buscarDraft`; cron via `POST /api/rondas/expirar`; e o script manual `prisma/scripts/expirar-rondas.ts` (mesmo SQL). `registrarAmbiente` renova `atualizadoEm` via `$executeRaw` para a ronda ativa não expirar no meio.
- **Divergências do CLAUDE.md:** rotas usam `verifyAuthDetailed` (não o `verifyAuth` documentado); `POST /api/rondas/expirar` usa `NextResponse.json` direto (não os helpers); `registrarAmbiente` não usa `$transaction` (nested `createMany` + um `$executeRaw` separado — a atualização de `atualizadoEm` não é atômica com o insert); o payload real do JWT tem `tenantIds` e o role `admin_multi`, não documentados; `viewer` (documentado como read-only) é hoje **alias legado de `admin_multi`** e tem acesso a rotas de escrita (`POST /api/rondas`, `POST .../ambientes`).
- **`listarRondasAdmin`:** o filtro usa `tenantIds.length > 0` (não `> 1`) de propósito — com exatamente 1 id o `in` equivale à igualdade; a versão anterior deixava o caso de 1 tenant cair no fallback e, sem `tenantId`, abria a consulta cross-tenant.
- **Draft do super_admin:** `/api/rondas/draft` usa o tenant placeholder fixo `00000000-0000-0000-0000-000000000001` quando `role === 'super_admin'` (FK de `RondaDraft.tenantId` exige um tenant existente).
- `salvarDraftAPI` no client usa `fetch` cru (fora do wrapper `api`) e o `PUT` do draft aceita `estado` sem validação Zod (JSON livre).
