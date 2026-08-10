# Módulo `manutencoes`

> Manutenções executadas pelo operador (elétrica, hidráulica ou patrimônio) com foto antes/depois obrigatória, histórico por tenant/bem e painel gerencial cross-unidade.

## Responsabilidade

Registrar a execução de uma manutenção em duas etapas — iniciar (`em_andamento`, com `fotoAntes`) e finalizar
(`concluida`, com `fotoDepois`) — e servir as leituras: em andamento do próprio usuário, histórico do tenant,
concluídas por bem do Trilogo (modal /admin/bens e página pública /bem/[token]), detalhe com fotos e o painel
gerencial do admin. Permissões do relatório vivem em regras puras (`manutencoes.rules.ts`).

## Arquivos

| Arquivo | Papel |
|---|---|
| `manutencoes.service.ts` | Toda a lógica + queries Prisma (iniciar, finalizar, listagens, detalhe com fotos) |
| `manutencoes.types.ts` | Schemas Zod (`IniciarManutencaoSchema` como discriminated union por `tipo`, `FinalizarManutencaoSchema`) |
| `manutencoes.rules.ts` | Regras puras: `ROLES_RELATORIO_MANUTENCOES` e `podeVerRelatorio(role)` |
| `manutencoes.rules.test.ts` / `manutencoes.service.test.ts` | Testes das regras de acesso e da forma das queries (escopo obrigatório) |

## Funções públicas

| Função | Assinatura real | Descrição |
|---|---|---|
| `iniciar` | `iniciar(tenantId: string, criadoPorId: string, input: IniciarManutencaoInput)` | Cria `em_andamento`. `patrimonio`: grava `trilogoAssetId`/`patrimony`/`descricaoBemSnapshot`/`subtipoPatrimonio`. `eletrica\|hidraulica`: resolve ambiente ativo no tenant e grava snapshot de ambiente/bloco |
| `finalizar` | `finalizar(tenantId: string, id: string, input: FinalizarManutencaoInput)` | Encontra qualquer `em_andamento` **da unidade** (`where: { id, tenantId, status: 'em_andamento' }` — sem filtro por criador, de propósito: um operador inicia e outro pode concluir); grava `fotoDepois`/`observacaoFinal`/`finalizadaEm`; `null` se não achou |
| `listarRealizadasPorAssets` | `listarRealizadasPorAssets(trilogoAssetIds: number[], escopo: EscopoLeitura)` | Concluídas do tipo `patrimonio` por bens, **restritas às unidades do escopo** (obrigatório: ids do Trilogo são inteiros sequenciais — sem filtro seria varredura enumerável); sem fotos |
| `listarHistorico` | `listarHistorico(tenantId: string \| null, tenantIds?: string[])` | Todas do escopo (`tenantFilter`), qualquer tipo/status, `iniciadaEm desc`; sem fotos |
| `listarManutencoesAdmin` | `listarManutencoesAdmin(escopo: EscopoLeitura)` | Painel gerencial cross-unidade (`take: 500`), **com** fotos antes/depois e o tenant de cada linha |
| `buscarRealizadaComFotos` | `buscarRealizadaComFotos(id: string, escopo: EscopoLeitura)` | Detalhe individual com fotos; escopo obrigatório (as fotos são o dado mais sensível da tabela) |
| `listarEmAndamentoDaUnidade` | `listarEmAndamentoDaUnidade(tenantId: string)` | Manutenções `em_andamento` **da unidade** (qualquer operador), para retomar/finalizar; inclui `criadoPor.nome` (quem fez a foto antes), `ambienteId`/`trilogoAssetId` p/ reconstruir a tela de finalizar |

`EscopoLeitura` vem de `modules/auth/tenant-filter` (`escopoLeitura(session)`): distingue "super_admin vê tudo"
de "sessão sem unidade" (que **fecha** — `tenantId: { in: [] }`), ambiguidade que o `null` de `tenantFilter` tinha.

## Regras de negócio

- Fluxo em duas fases; `fotoAntes` obrigatória ao iniciar e `fotoDepois` ao finalizar (Zod `min(20)`, máx. 2.000.000 chars ≈ 1,5 MB base64).
- Qualquer operador da unidade finaliza uma manutenção `em_andamento` (um inicia com a foto antes, outro pode concluir com a foto depois). Escopo por `tenantId` preserva o isolamento; **quem finaliza não é registrado** (o `criadoPor` continua sendo quem iniciou) — se precisar de rastreio, adicionar `finalizadoPorId` (migration).
- **Relatório** (`manutencoes.rules.ts`, testado): `ROLES_RELATORIO_MANUTENCOES = super_admin, tenant_admin, admin_multi, operator_patrimonio, viewer` — **não** inclui `operator` (ele executa, mas não consulta o consolidado). `podeVerRelatorio` aceita `string` de propósito (o `SessionPayload.role` de lib/auth não é a união tipada).
- `IniciarManutencaoSchema` é discriminated union por `tipo`: `eletrica`/`hidraulica` exigem `ambienteId` (uuid); `patrimonio` exige `trilogoAssetId`, `patrimony`, `descricaoBem` e `subtipoPatrimonio`.
- Snapshots preservam histórico se ambiente/bem forem removidos (`onDelete: SetNull`).

## Modelos de banco

| Modelo | Tabela | Campos-chave | Índices |
|---|---|---|---|
| `ManutencaoRealizada` | `manutencoes_realizadas` | `tenantId`, `criadoPorId`, `tipo ('eletrica'\|'hidraulica'\|'predial'\|'patrimonio')`, `status ('em_andamento'\|'concluida')`, `ambienteId?` + snapshots, `trilogoAssetId?`/`patrimony?`/`descricaoBemSnapshot?`/`subtipoPatrimonio?`, `descricao`, `observacaoFinal?`, `fotoAntes` (obrigatória), `fotoDepois?`, `iniciadaEm`, `finalizadaEm?` | `[tenantId, status]`, `[tenantId, tipo, iniciadaEm]`, `[criadoPorId, status]` |

## Rotas de API que usam este módulo

| Método + caminho | Roles (guard real) | O que faz |
|---|---|---|
| `GET /api/me/manutencoes` | `operator, operator_patrimonio, tenant_admin` (`verifyAuth`) | Em andamento do usuário logado |
| `POST /api/me/manutencoes` | `operator, operator_patrimonio, tenant_admin` | Inicia manutenção |
| `POST /api/me/manutencoes/[id]/finalizar` | `operator, operator_patrimonio, tenant_admin` | Finaliza; 404 se não for do usuário/já concluída |
| `GET /api/manutencoes/historico` | `ROLES_RELATORIO_MANUTENCOES` (`verifyAuthDetailed`) | Histórico do escopo; a rota comenta que esconder o card na UI não protegeria uma chamada direta |
| `GET /api/manutencoes/realizadas?assetIds=1,2` | `super_admin, tenant_admin, admin_multi, operator_patrimonio, operator, viewer` | Concluídas de patrimônio por assets, com `escopoLeitura(session)` |
| `GET /api/manutencoes/realizadas/[id]` | idem acima | Detalhe com fotos, com `escopoLeitura(session)` |
| `GET /api/admin/manutencoes` | `super_admin, tenant_admin, admin_multi, viewer` | Painel gerencial cross-unidade (com fotos) |

## Consumo no client

- `src/services/manutencoes.service.ts` — `iniciar`, `finalizar`, `buscarBemPorPatrimonio` (via `/api/me/bens/buscar`), `listarRealizadasPorAssets`, `buscarRealizadaDetalhe`, `listarHistorico`.
- `src/services/admin-manutencoes.service.ts` — `listarManutencoesAdmin()` para o painel `/admin/manutencoes` (`src/app/admin/manutencoes/page.tsx`, TanStack Query).
- `src/hooks/useManutencao.ts` — `useManutencao()`: fluxo do operador em `src/app/[tenantSlug]/manutencao/*`.
- Página pública `/bem/[token]` (`BensConteudo.tsx`) chama `listarRealizadasPorAssets` **após login** dentro da página.

## Padrões aplicados

- Fotos base64 nunca em listagens (exceto o painel admin, que exibe antes/depois na lista de propósito):

```ts
// listarRealizadasPorAssets — escopo obrigatório contra enumeração de assetIds
where: {
  tipo: 'patrimonio', status: 'concluida',
  trilogoAssetId: { in: trilogoAssetIds },
  ...filtroEscopo(escopo),
}
```

- Isolamento por `tenantFilter`/`filtroEscopo`; escopo por usuário (`criadoPorId`) nas rotas `me/*`.
- Zod discriminated union + `safeParse` + `badRequest`; helpers de `lib/api-response.ts` em todas as rotas.
- Regras de acesso em arquivo puro compartilhado entre UI, guard e API (mesma pegada de `chamados.rules.ts`).

## Observações e cuidados

- O tipo `'predial'` **existe no banco** (29 registros de produção, herdados do LinenSistem) e continua sendo gravado por aquele repo — já ficou fora da lista de tipos e a tela renderizou linhas sem rótulo (comentário no schema). O Zod daqui só aceita `eletrica|hidraulica|patrimonio`.
- `listarRealizadasPorAssets` e `buscarRealizadaComFotos` **exigiam escopo desde o fix recente** — versões antigas eram cross-tenant sem filtro; ao mexer aqui, jamais remover o `filtroEscopo`.
- Sessão sem unidade fecha (`filtroEscopo` devolve `tenantId: { in: [] }`) — comportamento diferente do `tenantFilter`, onde `null` abre para o super_admin.
- Não há cancelamento nem edição: manutenção iniciada só pode ser concluída (ou fica `em_andamento` para sempre).
- `subtipoPatrimonio` é texto livre validado só por tamanho (`max(200)`) — a lista de opções vive no client.
