# Módulo `links-publicos`

> Tokens públicos por ambiente para QR codes de bens: gera/reusa o link, resolve o token, acha o ambiente atual no Trílogo e lista agendamentos dos bens exibidos.

## Responsabilidade

Um QR code impresso num ambiente aponta para `/bem/[token]`, página **sem autenticação** que lista os bens
daquele ambiente (Trilogo) e seus agendamentos de manutenção. Este módulo cria/reusa o registro
`LinkPublicoBem` (o `id` UUID é o próprio token), resolve o token de volta para `(companyId, projeto,
ambiente)`, busca os bens que o QR mostra hoje — seguindo o ambiente quando ele foi renomeado ou
subdividido no Trílogo — e lê os agendamentos por asset para as telas públicas.

## Arquivos

| Arquivo | Papel |
|---|---|
| `links-publicos.service.ts` | Upsert/consulta do link, bens do link (fetch do Trílogo com cache) e agendamentos por assets |
| `ambiente-do-link.ts` | Regra pura: qual ambiente do Trílogo o nome gravado no link representa hoje |
| `ambiente-do-link.test.ts` | Testes da regra com endereços no formato real do Trílogo |

## Funções públicas

| Função | Assinatura real | Descrição |
|---|---|---|
| `criarOuBuscarLinkAmbiente` | `criarOuBuscarLinkAmbiente(input: CriarLinkAmbienteInput): Promise<string>` | Upsert por chave única `(companyId, projeto, ambiente)`; retorna o `id` (token). Trata corrida P2002: se outra requisição criou primeiro, busca e retorna o existente |
| `buscarLinkAmbiente` | `buscarLinkAmbiente(id: string)` | Resolve o token → `{ id, companyId, projeto, ambiente }` ou `null` |
| `listarBensDoLink` | `listarBensDoLink(link: { companyId; projeto; ambiente }): Promise<ResolucaoAmbiente<BemPublico>>` | Bens da empresa no Trílogo (cache 10 min por `companyId`) resolvidos pelo `resolverAmbienteDoLink`. **Lança** se o Trílogo falhar |
| `listarAgendamentosPorAssets` | `listarAgendamentosPorAssets(trilogoAssetIds: number[])` | Agendamentos com `status != 'cancelado'` dos bens informados, por `dataAgendada asc`; `[]` para lista vazia |
| `resolverAmbienteDoLink` | `resolverAmbienteDoLink<T>(link: { projeto; ambiente }, bens: T[]): ResolucaoAmbiente<T>` | Pura (`ambiente-do-link.ts`): `{ tipo, bens, ambientesAtuais, candidatos }` — ver regras abaixo |
| `normalizarNome` | `normalizarNome(nome: string): string` | Sem acento, maiúsculo, pontuação vira espaço, espaços colapsados |
| `lerEndereco` | `lerEndereco(enderecoCompleto): { projeto, bloco, ambiente, niveis }` | Mesma leitura do `parseEndereco` do admin: projeto = 3º segmento, ambiente = 5º (ou 4º com quatro níveis) |

`CriarLinkAmbienteInput = { companyId: number; projeto: string; ambiente: string; tenantId: string }`.

## Regras de negócio

- O token **é o UUID primário** do registro: não expira, não é assinado e não é revogável por código existente (só deletando a linha no banco). Mesmo ambiente → sempre o mesmo token (unique compõe a idempotência).
- O token só dá acesso ao recorte `(companyId, projeto, ambiente)` — a rota pública filtra os assets do Trilogo por esses três valores e sanitiza os campos expostos.
- **O link guarda o nome do ambiente, e o Trílogo não dá id de departamento no bem** (só `departmentFullAddress` em texto). Renomear o ambiente no Trílogo deixava o QR já impresso abrindo vazio, sem aviso — em 20/10/2026 eram 33 de 383. `resolverAmbienteDoLink` tenta, em ordem, e só quando o nome gravado não casa mais:
  1. `exato` — o casamento de sempre; quando há bem com o nome gravado, nada muda;
  2. `grafia` — mesmo nome a menos de acento, caixa e pontuação (`DML PEDIATRIA` → `DML-PEDIATRIA`);
  3. `subdividido` — o ambiente virou bloco com sub-ambientes (`HRPG > LOGISTICA` → `HRPG > LOGISTICA > VINDO DA MATRIZ`); mostra os bens de todos;
  4. `renomeado` — **um único** ambiente do projeto contém o nome antigo inteiro, em palavras inteiras (`RECUPERAÇÃO PÓS ANESTÉSICA` → `RPA - RECUPERAÇÃO PÓS ANESTÉSICA`). Nome antigo de uma palavra só não segue ("UTI" ≠ "UTI NEONATAL");
  5. `nao-encontrado` — nenhum dos anteriores; se vários ambientes contêm o nome antigo, eles voltam em `candidatos` e nenhum é escolhido. Melhor dizer que o ambiente sumiu do que mostrar bens de outra sala.
- A tabela `links_publicos_bens` não muda: o link continua apontando para o nome de quando foi gerado, e a resolução acontece a cada leitura. Ambiente esvaziado ou apagado no Trílogo só volta a funcionar com um QR novo.

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
| `GET /api/public/bens/[token]` | **nenhum** (público) | Resolve o token, chama `listarBensDoLink`, sanitiza (`sanitizeBem`: id, patrimony, description, brand, model, status, assetTypeName, coverPermalink) e devolve `{ ambiente, projeto, resolucao, ambientesAtuais, candidatos, bens, agendamentos }` |

Além das rotas, a **página** `src/app/bem/[token]/page.tsx` (server component, também pública) chama
`buscarLinkAmbiente` e `listarBensDoLink` — a mesma resolução da rota. Mostra um aviso quando o Trílogo
renomeou ou subdividiu o ambiente, uma mensagem própria quando ele não existe mais (com os `candidatos`,
se houver) e outra quando o Trílogo não respondeu — antes, as duas últimas viravam "Nenhum bem encontrado".

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
- O cache de bens de `listarBensDoLink` é em memória por instância (10 min por `companyId`). O `/asset` devolve a base inteira do Trílogo (~12 mil bens), acima do limite de 2 MB do cache de fetch do Next — por isso a página não usa mais `next: { revalidate }`.
