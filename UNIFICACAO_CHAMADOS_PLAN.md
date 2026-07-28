# Plano — Unificar Tickets do Trílogo com Chamados

**Data:** 2026-07-27
**Status:** Proposta — depende de decisões de negócio (§2 e §7)
**Objetivo:** todo ticket do Trílogo vira um chamado; abrir chamado novo segue como está; tudo num lugar só.

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

**Recomendação:** **A**, se a organização puder parar de abrir ticket no Trílogo. É a única opção que
entrega a unificação sem criar divergência permanente. **C** serve como passo intermediário enquanto
essa decisão não vem — e não desperdiça trabalho, porque a tela unificada é necessária nos três casos.

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
| `currentStatus.actionDescription` | `status` | **1:1** — Aberto→`aberto`, Em andamento→`em_execucao`, Concluído→`finalizado`, Cancelado→`cancelado` |
| `priority` (número) | `prioridade` | precisa de tabela de conversão para baixa/media/alta/urgente |
| `buildingServiceTypeDescription` | `tipo` | precisa de mapa para eletrica/hidraulica/civil/… |
| — | `fotoAbertura` | tickets do Trílogo não trazem foto |

O mapeamento de status ser 1:1 é a melhor notícia deste levantamento: o ciclo de vida dos dois lados
já é o mesmo.

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

## 7. Perguntas que precisam de resposta antes de implementar

1. **A organização pode parar de abrir ticket no Trílogo?** Quem mais abre ticket lá — só a equipe
   interna, ou terceiros (empresa de manutenção, fornecedores)? Se terceiros abrem, o cenário A não
   se sustenta sozinho.
2. **Importar o quê?** Tudo, só os abertos, ou uma janela de N meses?
3. **Qual número a pessoa enxerga** num chamado importado: o local (`#26`), o do Trílogo, ou os dois?
4. **Ticket que não casar com nenhuma unidade:** fila de triagem manual, ou regra de descarte
   explícita?
5. **O que acontece com `/admin/patrimonio`:** vira uma visão filtrada de chamados, ou é aposentada?
