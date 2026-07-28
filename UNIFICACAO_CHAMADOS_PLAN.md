# Plano — Unificar Tickets do Trílogo com Chamados

**Data:** 2026-07-27 · **Revisado:** 2026-07-28 com dados de produção
**Status:** Implementado no PR #5 — cenário **B**, não o A recomendado abaixo (ver §2)
**Objetivo:** todo ticket do Trílogo vira um chamado; abrir chamado novo segue como está; tudo num lugar só.

> **Leia o §0 antes do resto.** Este documento foi escrito antes de alguém consultar a API do Trílogo.
> Três das suas afirmações centrais estavam erradas. O texto original foi mantido para que se veja o
> que mudou e por quê — as correções estão marcadas em cada seção.

---

## 0. O que os dados de produção mostraram (28/07/2026)

868 tickets de uma janela de 120 dias, 12.410 bens e os 6 tenants cadastrados.

**O mapeamento de status NÃO era 1:1.** É o erro mais grave deste documento. Os valores reais são
`Executado` (697), `Em Execução` (101), `Aberto` (66), `Arquivado` (3) e `Cancelado` (1). O texto
abaixo afirma `Concluído` e `Em andamento` — nomes que a API não devolve. Como `Executado` não casava
com nada, cairia no padrão `aberto`: **697 tickets já resolvidos virariam chamados abertos**, 80% da
importação. A frase "o mapeamento de status ser 1:1 é a melhor notícia deste levantamento" era
suposição apresentada como fato.

**A escala de prioridade não é usada.** Todos os 868 tickets vêm com `priority: 2`. Não há o que
converter na prática, e o contador de "urgentes" das telas de patrimônio — que somava `priority >= 3`
— sempre mostrou zero.

**A heurística de unidade não é frágil.** Resolveu **868 de 868**, todas pelo `trilogoProjectName`,
nenhuma ambígua. Os seis tenants têm projeto configurado. §3 chamava isso de "heurística frágil"; a
fila de triagem continua necessária, mas por outros motivos (ticket sem prazo), não por este.

**80% dos tickets não têm bem vinculado.** 695 de 868, quase todos do tipo de serviço `Solicitações`.
O filtro `assetId || patrimony` os exclui — decisão que continua de pé, porque o modelo de chamado só
tem os tipos elétrica/hidráulica/patrimônio e classificar uma solicitação genérica como patrimônio
seria pior do que não importar. **Esta é a única pergunta de negócio ainda aberta.**

**25% dos tickets não têm `deadline`** (219 de 868), mas só 8 deles têm bem vinculado. Como `prazo` é
obrigatório no modelo e inventar prazo produziria atraso falso, esses 8 vão para a fila de triagem.

---

## 1. Situação atual

### Chamados (local)

Tabela `chamados` no banco da aplicação. Ciclo completo — `aberto → em_execucao → finalizado | cancelado` —
com responsável, assumir/atribuir, foto de abertura e execução, prazo, campos fiscais (admin) e
numeração legível `#N`. Módulo criado em 23/07, em produção desde 24/07.

### Tickets de Patrimônio (Trílogo)

`/admin/patrimonio` chama `GET /api/trilogo?startDate&endDate`, que repassa para
`GET {TRILOGO_BASE}/ticket`, filtra os que têm `assetId` ou `patrimony`, e associa cada ticket a um
tenant comparando `companyId` e verificando se `departmentFullAddress` contém `trilogoProjectName`.

Três fatos que determinam o desenho:

1. **A integração é somente leitura.** Todas as chamadas ao Trílogo no repositório são `GET`
   (`/ticket` e `/asset`). Não existe `POST`, `PUT`, `PATCH` ou `DELETE` — o sistema **não consegue**
   criar nem alterar ticket no Trílogo.
2. **Nada é persistido.** Os tickets são buscados ao vivo a cada acesso à tela. Não há tabela local.
3. **O cron `sync-trilogo` não sincroniza tickets** — apesar do nome, ele sincroniza blocos e
   ambientes (`sincronizarTenant`).

> O Trílogo continua sendo o **cadastro de bens** em qualquer cenário: `/asset` alimenta Bens por
> Ambiente, links públicos e busca por patrimônio. Esta unificação move **apenas os tickets**.

---

## 2. A decisão que define tudo

Como não escrevemos no Trílogo, não existe unificação sem escolher quem é a fonte da verdade.

### A. Corte — o sistema assume os chamados

Importa o histórico do Trílogo uma vez; a partir da data do corte, todo chamado nasce aqui.

*A favor:* entrega o que foi pedido, sem divergência. Operação passa a ter um lugar só, e o chamado
importado é operável (assumir, finalizar, campos fiscais).
*Contra:* exige que a organização **pare de abrir ticket no Trílogo**. O que for aberto lá depois do
corte não aparece aqui.

### B. Espelho contínuo

Sincroniza os tickets do Trílogo para a tabela local periodicamente.

*A favor:* quem abre no Trílogo continua abrindo.
*Contra:* **divergência garantida.** Assumir ou finalizar um chamado importado não volta para o
Trílogo, porque não escrevemos lá. Na próxima sincronização, ou o trabalho local é sobrescrito, ou
convive-se com dois estados conflitantes do mesmo ticket. Exigiria regra de conflito para cada campo.

### C. União só na tela

Sem importação: a lista mostra chamados locais e tickets do Trílogo juntos, com a origem visível.

*A favor:* risco zero de dado, implementação pequena, reversível.
*Contra:* não é "tudo em um" de verdade — o ticket do Trílogo continua somente leitura, ninguém o
assume nem finaliza pelo sistema.

**Recomendação original:** **A**, se a organização puder parar de abrir ticket no Trílogo.

> **O que foi implementado: B, e de propósito.** A instrução foi "os do Trílogo são adicionados
> automaticamente", o que exclui o corte. A divergência que o cenário B garante foi resolvida por
> uma regra que este documento não previa: a sincronização é **INSERT-ONLY**. O ticket semeia o
> chamado uma vez e, a partir daí, quem manda é o ciclo de vida local — a sincronização nunca
> atualiza um chamado que já existe. Não há sobrescrita nem regra de conflito por campo, porque não
> há segunda escrita. O que se perde é a atualização vinda de lá, e ela é visível: o card mostra o
> status que o Trílogo tinha no momento da importação (`trilogoStatusOrigem`).

---

## 3. Bloqueios no modelo atual

Cinco coisas precisam ser resolvidas antes de importar qualquer ticket.

**Falta chave de idempotência.** `Chamado` tem `trilogoAssetId`, que é o **bem**, não o ticket. Sem um
`trilogoTicketId` único, reimportar duplica tudo. → nova coluna + índice único + migration.

**`criadoPorId` é obrigatório e tem FK para `Usuario`.** O ticket do Trílogo traz `assigneeName`
(texto), não um usuário local. → ou um usuário de sistema ("Importado do Trílogo"), ou tornar o campo
nulo com regra explícita de exibição.

**`titulo` é obrigatório e o Trílogo não tem título.** → derivar de `assetName` ou da `description`
truncada, gravando a descrição completa em `descricao`.

**`tenantId` é obrigatório e vem de heurística frágil.** A associação atual compara `companyId` e
procura `trilogoProjectName` como substring de `departmentFullAddress`, em maiúsculas. Ticket que não
casar fica sem unidade — precisa de fila de triagem, **não pode ser descartado em silêncio**.

**Numeração dupla.** `numero` é autoincremento local e o ticket tem id próprio no Trílogo. Importação
em massa consome uma faixa de números e mistura duas numerações na mesma tela.

### O que mapeia bem

| Trílogo | Chamado | Observação |
|---|---|---|
| `description` | `descricao` | direto |
| `deadline` | `prazo` | direto |
| `creationDate` | `criadoEm` | direto |
| `assetId` / `patrimony` | `trilogoAssetId` / `patrimony` | campos já existem |
| `currentStatus.actionDescription` | `status` + `trilogoStatusOrigem` | ver abaixo — **não é 1:1** |
| `priority` (número) | `prioridade` | 1 Baixa · 2 Média · 3 Alta · 4 Urgente (do `PRIORITY_LABEL` das telas). Na prática só chega 2 |
| `buildingServiceTypeDescription` | `tipo` | elétrica/hidráulica pela descrição; o resto cai em patrimônio |
| — | `fotoAbertura` | tickets do Trílogo não trazem foto |

**Status — valores reais e o que foi implementado:**

| Trílogo | ocorrências | Chamado | por quê |
|---|---:|---|---|
| `Executado` | 697 | `finalizado` | — |
| `Em Execução` | 101 | `aberto` | o responsável do Trílogo não é usuário daqui, e `assumir` exige `aberto`; importar em execução criaria chamado sem responsável que ninguém pode pegar |
| `Aberto` | 66 | `aberto` | — |
| `Arquivado` | 3 | `cancelado` | interpretação: arquivado parece fechado sem execução |
| `Cancelado` | 1 | `cancelado` | — |
| *(desconhecido)* | — | `aberto` | aparece na fila para alguém tratar; sumir como finalizado esconderia trabalho |

O texto cru vai para `trilogoStatusOrigem` em toda importação. É o que torna um mapeamento errado
corrigível por `UPDATE`, em vez de informação perdida.

---

## 4. Etapas (cenário A)

1. **Migration** — `trilogoTicketId Int? @unique` em `chamados`, com índice.
2. **Usuário de sistema** para autoria dos importados, criado por seed idempotente.
3. **Tabelas de conversão** de `priority` e `buildingServiceTypeDescription`, com valor padrão
   explícito para o que não casar (nunca silencioso).
4. **Importador idempotente**, com a mesma disciplina do script de unificação de usuários: simulação
   por padrão, backup em JSON antes de escrever, transação única, contagem antes/depois, nenhum
   `DELETE`. Reexecutar não duplica, graças ao índice único.
5. **Fila de triagem** para tickets sem unidade resolvida — relatório, não descarte.
6. **UI** — origem visível no chamado (ex.: selo "Trílogo #1234"), filtro por origem na listagem.
7. **`/admin/patrimonio`** deixa de consultar o Trílogo e passa a ler chamados filtrados por origem,
   ou é aposentada com redirect para `/admin/chamados`.
8. **Comunicação** — a partir da data do corte, chamado só se abre no sistema.

---

## 5. Riscos

**Volume de histórico.** Importar todos os tickets já concluídos enche a base de registros sem valor
operacional. Considerar janela (só abertos, ou últimos N meses).

**Ticket alterado no Trílogo depois do corte** fica desatualizado aqui, e ninguém percebe. É o custo
inerente do cenário A e o motivo de a comunicação (§4.8) não ser opcional.

**Nada se perde.** A importação é aditiva: o Trílogo continua com todos os dados dele, e nenhum
registro local é apagado em nenhuma etapa.

---

## 6. O que não muda

- Fluxo de abrir chamado novo — permanece exatamente como está
- Cadastro de bens continua vindo do Trílogo (`/asset`)
- Permissões de chamados (quem cria, opera, atribui, cancela)
- O cron `sync-trilogo` de blocos e ambientes

---

## 7. As perguntas, e como cada uma foi respondida

1. **A organização pode parar de abrir ticket no Trílogo?**
   Não se aplica — o cenário A foi descartado. Continua-se abrindo lá, e a sincronização traz.

2. **Importar o quê?**
   Tudo, concluídos inclusive. A fila mostra os terminais por último, com tetos separados (200 vivos,
   100 terminais) para o histórico não espremer o que ainda pede trabalho.

3. **Qual número a pessoa enxerga?**
   Os dois. O `#N` local é o principal; o do Trílogo aparece ao lado, com ícone de origem.

4. **Ticket que não casar com nenhuma unidade?**
   Fila de triagem persistida (`tickets_trilogo_triagem`), com tela em `/admin/chamados/triagem`. Não
   basta relatar no retorno da execução: a janela de busca é móvel, então o ticket recusado sumiria
   em poucos dias. Com os dados atuais essa fila fica vazia por este motivo — 868 de 868 resolvem.

5. **O que acontece com `/admin/patrimonio`?**
   Virou visão de chamados com bem vinculado. `/viewer/patrimonio` também; as duas eram cópias e
   viraram um componente só. O proxy de tickets `/api/trilogo` ficou sem consumidor.

### Ainda em aberto

**Os 695 tickets sem bem vinculado (80%) devem virar chamados?** São quase todos `Solicitações`. Hoje
o filtro `assetId || patrimony` os exclui. Importá-los exigiria um tipo de chamado novo — chamar uma
solicitação genérica de "patrimônio" seria pior do que deixar de fora.

---

## 8. O que foi encontrado no caminho

Coisas que não faziam parte do plano e apareceram enquanto ele era executado.

**A fila de chamados ordenava por `status` alfabético** — `aberto`, `cancelado`, `em_execucao`,
`finalizado`. Cancelados vinham na frente dos que estavam em execução, e o `take: 200` cortava por
essa mesma ordem: uma unidade com muitos cancelados já empurrava chamados vivos para fora da lista.

**`/api/trilogo/assets` filtrava só por `companyId`**, sem projeto. No Amapá, onde três hospitais
dividem o `companyId` 168, isso significa o admin do HRPG enxergando os bens da UEI e da UPA Zona Sul.

**`if (!projectName) return true`** em três lugares: tenant sem projeto configurado enxergava todos os
bens da empresa. Hoje todos têm projeto, então a correção é preventiva.

**As migrations nunca rodavam no deploy.** O build era só `next build`. As três migrations do Trílogo
estavam pendentes em produção. O `prisma migrate deploy` agora roda antes do build e **só** em
`VERCEL_ENV=production` — preview usa a mesma `DATABASE_URL`, então um migrate solto aplicaria em
produção as migrations de qualquer branch aberta.

**A porta do cron aceitava qualquer requisição** com o header `x-vercel-cron-signature` preenchido,
sem conferir o conteúdo (corrigido no PR #7).
