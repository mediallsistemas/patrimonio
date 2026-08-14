# Módulo `links-publicos`

> Tokens públicos por ambiente para QR codes de bens: gera/reusa o link, resolve o token e lista agendamentos dos bens exibidos.

## Responsabilidade

Um QR code impresso num ambiente aponta para `/bem/[token]`, página **sem autenticação** que lista os bens
daquele ambiente (Trilogo) e seus agendamentos de manutenção. Este módulo cria/reusa o registro
`LinkPublicoBem` (o `id` UUID é o próprio token), resolve o token de volta para `(companyId, projeto,
ambiente)` e lê os agendamentos por asset para as telas públicas.

## Arquivos

| Arquivo | Papel |
|---|---|
| `links-publicos.service.ts` | Upsert/consulta do link + listagem de agendamentos por assets |

## Funções públicas

| Função | Assinatura real | Descrição |
|---|---|---|
| `criarOuBuscarLinkAmbiente` | `criarOuBuscarLinkAmbiente(input: CriarLinkAmbienteInput): Promise<string>` | Upsert por chave única `(companyId, projeto, ambiente)`; retorna o `id` (token). Trata corrida P2002: se outra requisição criou primeiro, busca e retorna o existente |
| `buscarLinkAmbiente` | `buscarLinkAmbiente(id: string)` | Resolve o token → `{ id, companyId, projeto, ambiente }` ou `null` |
| `listarAgendamentosPorAssets` | `listarAgendamentosPorAssets(trilogoAssetIds: number[])` | Agendamentos com `status != 'cancelado'` dos bens informados, por `dataAgendada asc`; `[]` para lista vazia |

`CriarLinkAmbienteInput = { companyId: number; projeto: string; ambiente: string; tenantId: string }`.

## Regras de negócio

- O token **é o UUID primário** do registro: não expira, não é assinado e não é revogável por código existente (só deletando a linha no banco). Mesmo ambiente → sempre o mesmo token (unique compõe a idempotência).
- O token só dá acesso ao recorte `(companyId, projeto, ambiente)` — a rota pública filtra os assets do Trilogo por esses três valores e sanitiza os campos expostos.

## Modelos de banco

| Modelo | Tabela | Campos-chave | Índices |
|---|---|---|---|
| `LinkPublicoBem` | `links_publicos_bens` | `id` (token), `companyId Int`, `projeto`, `ambiente`, `tenantId`, `criadoEm` | `@@unique([companyId, projeto, ambiente])`, `[companyId]` |

`listarAgendamentosPorAssets` lê `AgendamentoManutencao` (módulo `agendamentos`) — dependência cruzada intencional.

## Rotas de API que usam este módulo

| Método + caminho | Roles (guard real) | O que faz |
|---|---|---|
| `POST /api/bens/link-publico` | `super_admin, tenant_admin, operator_patrimonio, admin_multi, viewer` (`verifyAuth`) | Gera/reusa o token para o ambiente (`{ companyId, projeto, ambiente }` no body) — usado pelo `ModalQrCode` |
| `GET /api/bens/agendamentos-publicos?assetIds=1,2` | `super_admin, tenant_admin, operator_patrimonio, operator` (`verifyAuth`) | Agendamentos por assets (apesar do nome, **exige auth** — a página pública só chama após login) |
| `GET /api/public/bens/[token]` | **nenhum** (público) | Resolve o token, busca os assets da empresa no Trilogo (cache 10 min por `companyId`), filtra por projeto/ambiente, sanitiza (`sanitizeBem`: id, patrimony, description, brand, model, status, assetTypeName, coverPermalink) e devolve bens + agendamentos |

Além das rotas, a **página** `src/app/bem/[token]/page.tsx` (server component, também pública) chama
`buscarLinkAmbiente` direto e faz seu próprio fetch do Trilogo com `next: { revalidate: 600 }`.

### Fluxo do token e rate limiting

1. Admin abre o `ModalQrCode` (`/admin/bens`) → `POST /api/bens/link-publico` → recebe `{ token }` → QR aponta para `{base}/bem/{token}`.
2. Visitante escaneia → `/bem/[token]` renderiza sem login (middleware: `/bem` e `/api/public` estão em `PUBLIC_PATHS`).
3. No middleware, `/api/public/bens` tem regra de rate limit de **30 req/min por IP** (em memória, por instância — nota no código: usar Redis em multi-instância). A página `/bem/*` em si não tem regra de rate limit própria.
4. Dentro da página, agendamentos e manutenções realizadas só carregam **após login** no próprio componente (`BensConteudo.tsx` chama `/api/bens/agendamentos-publicos` e `/api/manutencoes/realizadas` com credenciais).

## Consumo no client

- `src/app/admin/bens/components/ModalQrCode.tsx` — `fetch('/api/bens/link-publico')` direto (sem service dedicado).
  Compõe o cartão (logo + nome do ambiente + QR) num `<canvas>` desenhado em 3× e oferece **Baixar PNG**,
  copiar link, abrir e imprimir. As ações só habilitam com `pronto === true` (desenho concluído) — o QR é a
  última coisa pintada, então liberar antes disso gerava download/impressão de cartão sem QR. O carregamento
  do logo tem timeout de 3 s: se travar, o cartão sai sem logo em vez de ficar em branco para sempre.
- `src/app/bem/[token]/BensConteudo.tsx` — fetch de agendamentos públicos + `manutencoes.service.listarRealizadasPorAssets` após login.

## Padrões aplicados

- Idempotência com tratamento de corrida:

```ts
const result = await prisma.linkPublicoBem.upsert({ where, update: {}, create: {...}, select: { id: true } })
// P2002 (corrida): outra requisição criou — busca e retorna o existente
```

- Sanitização de saída na rota pública (`sanitizeBem`) — nunca o objeto cru do Trilogo.
- Helpers de `lib/api-response.ts`; erros do Trilogo viram `serverError` genérico.

## Observações e cuidados

- **`tenantId: session.tenantId ?? 'super_admin'`** na rota `POST /api/bens/link-publico`: super_admin grava a string literal `'super_admin'` como `tenantId` — não é FK, não referencia tenant real.
- `LinkPublicoBem` não tem `@@index([tenantId])` nem relação com `Tenant` — diverge da convenção de banco do CLAUDE.md (o campo é só informativo).
- `listarAgendamentosPorAssets` **não filtra tenant** — o recorte vem dos `assetIds` que o chamador passa; na rota pública eles derivam do link, mas na rota autenticada `agendamentos-publicos` qualquer usuário logado pode consultar assets arbitrários (diferente de `manutencoes/realizadas`, que passou a exigir escopo).
- O rate limiter é em memória por processo; atrás de load balancer multi-instância o limite efetivo multiplica.
- A lógica de filtragem de assets existe em **dois lugares** (rota `/api/public/bens/[token]` e página `/bem/[token]/page.tsx`), com heurísticas de segmento levemente diferentes (`parts[4] ?? parts[3]`) — mudanças precisam ser espelhadas.
