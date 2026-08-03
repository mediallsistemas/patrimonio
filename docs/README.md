# Documentação do Sistema

Índice da documentação técnica. Gerada a partir do **código real** em `1358341`
(31/07/2026). Em caso de conflito com o `CLAUDE.md`, os documentos abaixo são a
fonte de verdade — eles registram inclusive as divergências conhecidas.

## Visão geral

| Documento | Conteúdo |
|-----------|----------|
| [ARQUITETURA.md](./ARQUITETURA.md) | Camadas, fluxo de request, padrões transversais (auth, tenant, Zod, erros, rate limit, fotos, draft, Trilogo), mapa de rotas, testes e scripts |
| [PERMISSOES.md](./PERMISSOES.md) | Modelo de papéis e escopo multi-tenant (`admin_multi`, alias legado `viewer`, roles órfãos, SQL de migração pendente) |

## Camadas (`src/`)

| Documento | Conteúdo |
|-----------|----------|
| [lib/README.md](../src/lib/README.md) | Utilitários server-side: db, auth, api-response, caches |
| [hooks/README.md](../src/hooks/README.md) | Todos os hooks, padrão de estado de cada um, herança `useRondaBase` |
| [services/README.md](../src/services/README.md) | Client services e o wrapper `api.ts` (erros, `x-tenant-id`) |
| [components/README.md](../src/components/README.md) | Catálogo de componentes por subpasta |
| [utils/README.md](../src/utils/README.md) | Utilitários puros |

## Módulos de negócio (`src/modules/*/README.md`)

Cada módulo tem um README no mesmo template: responsabilidade, arquivos, funções
públicas, modelos de banco, rotas consumidoras (com roles reais), consumo no
client, padrões aplicados e observações/gotchas.

| Módulo | Domínio |
|--------|---------|
| [auth](../src/modules/auth/README.md) | Guards JWT, escopo de tenant (`tenant-filter`), contrato `JWTPayload` |
| [tenants](../src/modules/tenants/README.md) | CRUD de tenants, resolução de slug |
| [usuarios](../src/modules/usuarios/README.md) | CRUD de usuários (banco de auth compartilhado), reset de senha |
| [rondas](../src/modules/rondas/README.md) | Rondas de ocorrências + draft/auto-recuperação + expiração 24h |
| [ocorrencias](../src/modules/ocorrencias/README.md) | Detalhes de ocorrência com foto |
| [rodadas](../src/modules/rodadas/README.md) | Inspeção de gases (fluxo legado — o novo usa `tipoRegistro='gases'` em rondas) |
| [ambientes](../src/modules/ambientes/README.md) | Blocos e ambientes por tenant |
| [chamados](../src/modules/chamados/README.md) | Chamados de manutenção + sync automática de tickets Trilogo + regras (`chamados.rules.ts`) |
| [manutencoes](../src/modules/manutencoes/README.md) | Manutenções iniciar→finalizar com foto antes/depois |
| [agendamentos](../src/modules/agendamentos/README.md) | Agendamentos de manutenção por bem Trilogo |
| [bens](../src/modules/bens/README.md) | Busca de bens no Trilogo |
| [trilogo](../src/modules/trilogo/README.md) | Escopo de leitura por tenant para dados Trilogo (`escopo.ts`) |
| [links-publicos](../src/modules/links-publicos/README.md) | Links públicos de bens com QR (`/bem/[token]`, sem auth) |
| [dashboard](../src/modules/dashboard/README.md) | Agregações para o painel |
| [feedback](../src/modules/feedback/README.md) | Templates, respostas (soft delete) e analytics de pesquisas |
| [pessoas](../src/modules/pessoas/README.md) | Cadastro de pessoas + descritor facial (hotelaria) |
| [movimentacoes](../src/modules/movimentacoes/README.md) | Entrada/saída de enxoval |
| [face-match](../src/modules/face-match/README.md) | Comparação de descritores faciais (distância euclidiana) |
