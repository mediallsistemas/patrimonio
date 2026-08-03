# Módulo `feedback`

> Pesquisas de satisfação de pacientes (FeedbackForms): templates de formulário, respostas com soft delete e analytics por setor/período.

## Responsabilidade

Backend do sistema FeedbackForms: CRUD de templates (`TemplateFormulario`), submissão e listagem de respostas (`RespostaFormulario`, com soft delete via `deletadoEm`) e agregações de analytics (média geral, média/percentual de "recomendaria", agrupamentos por setor e período). Serve tanto as rotas internas quanto a **SPA FeedbackForms externa** (www.mediallquality.com), que envia campos em inglês.

## Arquivos

| Arquivo | Papel |
|---|---|
| `form-template.service.ts` | CRUD de templates (listar, buscar, criar, atualizar, deletar — hard delete) |
| `form-response.service.ts` | Submeter/listar/buscar respostas, soft delete, `buscarMetricas` (dashboard da SPA) |
| `analytics.service.ts` | `getSummary`, `getByPeriod`, `getByDepartment` + helpers de média (`recomendaria`/geral) |
| `feedback.types.ts` | DTOs TS (`CreateTemplateDto`, `CreateRespostaDto`, `RespostaCampo`, tipos de analytics) — **sem schemas Zod** |

## Funções públicas

| Função | Assinatura real | Descrição |
|---|---|---|
| `listarTemplates` | `(tenantId: string)` | Todos os templates do tenant, mais recentes primeiro |
| `buscarTemplate` | `(id: string, tenantId: string)` | `findFirst` com `{ id, tenantId }` |
| `criarTemplate` | `(tenantId: string, data: CreateTemplateDto)` | `campos` gravado como JSON; `ativo` default `true` |
| `atualizarTemplate` | `(id: string, tenantId: string, data: UpdateTemplateDto)` | `updateMany` escopado por tenant (retorna `count`) |
| `deletarTemplate` | `(id: string, tenantId: string)` | **Hard delete** (`deleteMany`) |
| `submeterResposta` | `(tenantId: string, data: CreateRespostaDto, criadoPorId?: string)` | Cria resposta; todos os campos de paciente são opcionais/null |
| `listarRespostas` | `(tenantId: string, filtros?: FiltrosRespostaDto)` | Filtros: setor, templateId, de/até; sempre `deletadoEm: null` |
| `buscarResposta` | `(id: string, tenantId: string \| null)` | `tenantId: null` = super_admin (sem filtro de tenant) |
| `softDeletarResposta` | `(id: string, tenantId: string \| null)` | Seta `deletadoEm = new Date()` via `updateMany` |
| `buscarMetricas` | `(tenantId: string, filtros?: FiltrosMetricasDto)` | Totais + médias (satisfação vs. "recomendaria") + respostas mês atual/anterior |
| `getSummary` | `(tenantId: string, filtros?)` | `totalRespostas`, `mediaRecomendaria`, `mediaGeral`, `pctRecomendaria` (% de nota ≥ 1), `porSetor` |
| `getByPeriod` | `(tenantId: string, filtros?)` | Agrupamento `'dia' \| 'semana' \| 'mes'` (default `mes`), agregado em JS |
| `getByDepartment` | `(tenantId: string, filtros?)` | Total + média "recomendaria" por setor |

A pergunta de recomendação é detectada por `ehCampoRecomendaria`: `pergunta === 'recomendaria' || 'nps' || pergunta.includes('recomend')` (compatibilidade com o campo "nps" legado).

## Modelos de banco

| Modelo Prisma | Tabela (`@@map`) | Campos-chave | Índices |
|---|---|---|---|
| `TemplateFormulario` | `templates_formulario` | `id`, `tenantId`, `nome`, `campos (Json)`, `ativo`, `criadoEm`, `atualizadoEm` | `@@index([tenantId])` |
| `RespostaFormulario` | `respostas_formulario` | `id`, `tenantId`, `templateId?`, `nomePaciente?`, `cpf?`, `idade?`, `genero?`, `dataInternacao?`, `dataAlta?`, `setor?`, `respostas (Json)`, `comentarios?`, `criadoEm`, `deletadoEm?`, `criadoPorId?` | `[tenantId, deletadoEm]`, `[tenantId, setor]`, `[tenantId, criadoEm]` |

## Rotas de API que usam este módulo

| Rota | Roles (verifyAuth real) | O que faz |
|---|---|---|
| `POST /api/feedback/form-responses` | **pública — sem auth obrigatória** (JWT usado só como fallback de tenant e para `criadoPorId`) | Submete resposta; mapeia campos da SPA (`answers`→`respostas`, `patientName`→`nomePaciente` etc.); tenant via `tenantId`/`tenantSlug` do body ou JWT |
| `GET /api/feedback/form-responses` | `['super_admin', 'tenant_admin']` | Lista respostas com filtros (aceita aliases `formType`/`startDate`/`endDate` da SPA) |
| `GET/DELETE /api/feedback/form-responses/[id]` | `['super_admin', 'tenant_admin']` + `assertSistema('feedbackforms')` | Busca / soft delete de uma resposta |
| `GET /api/feedback/form-responses/metrics` | `['super_admin', 'tenant_admin']` | `buscarMetricas` (retorno em inglês: `totalResponses`, `averageSatisfaction`, ...) |
| `GET/POST /api/feedback/form-templates` | `['super_admin', 'tenant_admin']` + `assertSistema` | Lista / cria templates (validação manual: `nome` e `campos` array) |
| `GET/PUT/DELETE /api/feedback/form-templates/[id]` | `['super_admin', 'tenant_admin']` + `assertSistema` | Busca / atualiza / hard-deleta template |
| `GET /api/feedback/analytics/summary\|by-period\|by-department` | `['super_admin', 'tenant_admin']` + `assertSistema` | Analytics, com mapeamento de saída para o formato da SPA |
| `GET /api/tenants/[slug]/form-templates` e `.../[formSlug]` | `verifyAuth(req)` — qualquer role autenticado | Templates públicos do tenant no formato da SPA (`{ id, slug, name, active, blocks }`; `formSlug` = UUID do template) |

Rate limiting no middleware: `POST /api/feedback/form-responses` — **5 req/min por IP**.

## Consumo no client

Não há service/hook neste repositório consumindo `/api/feedback/*` — o consumidor é a **SPA FeedbackForms** (projeto separado, mesmo `JWT_SECRET`, origem liberada via `CORS_ORIGINS`). Super_admin passa `?tenantSlug=` nas leituras (resolvido por `resolveTenantId`).

## Padrões aplicados

- **Soft delete — filtro obrigatório** em toda leitura de respostas:
  ```ts
  where: { tenantId, deletadoEm: null, ... }
  ```
  (aplicado em `listarRespostas`, `buscarResposta`, `softDeletarResposta`, `buscarMetricas` e nos 3 métodos de analytics; o índice `[tenantId, deletadoEm]` suporta o padrão).
- **Isolamento por tenant:** todas as funções recebem `tenantId` como argumento; mutações usam `updateMany/deleteMany` com `{ id, tenantId }` para impedir cross-tenant mesmo com id válido.
- **Gate por sistema:** `assertSistema(session, 'feedbackforms')` bloqueia usuários sem o sistema habilitado (super_admin sempre passa).
- **Agregação:** analytics carrega as respostas filtradas e agrega em JS (médias com `toFixed(2)`, buckets de período com `Map`), sem SQL agregado.

## Observações e cuidados

- **PII forte:** `nomePaciente`, `cpf`, `idade`, `genero`, datas de internação/alta. Não logar; a rota pública de submit aceita tudo isso sem autenticação (protegida apenas pelo rate limit 5/min).
- **Divergência — sem Zod:** nenhum boundary do feedback usa `safeParse`; a validação é manual (`if (!body.nome || !Array.isArray(body.campos))`) — contraria a regra "Zod at every API boundary" do CLAUDE.md.
- **Divergência — templates em hard delete:** só respostas têm `deletadoEm`; deletar template remove o registro de vez (respostas ligadas mantêm `templateId` órfão? Não — há FK; o delete falha se houver respostas referenciando).
- **Contrato com a SPA:** o mapeamento inglês↔português vive em `mapearCamposSPA` (route de form-responses) e nos mapeamentos de saída dos analytics. Renomear campos quebra a SPA — alterar sempre nos dois projetos.
- `assertSistema` lança `Error` genérico, capturado pelo `catch` das rotas → responde **500**, não 403.
- `templateId` vindo da SPA pode chegar como `formType` (string arbitrária); não é validado como UUID existente antes do `create` — FK inválida cai no `serverError`.
