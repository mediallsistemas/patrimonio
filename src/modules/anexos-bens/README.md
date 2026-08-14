# Módulo `anexos-bens`

> Anexos (nota fiscal, manual, laudo, foto…) vinculados a um bem do Trilogo, com teto por arquivo e cota por bem.

## Responsabilidade

O bem vive no ERP Trilogo e **não tem tabela local** — este módulo é o "campo extra" que o
sistema mantém do lado de cá, chaveado por `trilogoAssetId` (mesma estratégia de
`agendamentos` e `manutencoes`). Guarda o arquivo em base64 no banco, valida tamanho e tipo
real, e aplica o escopo de unidade em toda leitura/escrita.

## Arquivos

| Arquivo | Papel |
|---|---|
| `anexos-bens.types.ts` | Constantes de limite, lista de MIMEs, helpers puros (`bytesDeBase64`, `formatarBytes`) e o schema Zod. **Também consumido pela UI** — é a fonte única dos limites mostrados na tela |
| `anexos-bens.arquivo.ts` | Validação do arquivo pelos bytes reais (assinatura) contra o `mimeType` declarado |
| `anexos-bens.service.ts` | Prisma: listar metadados, criar (com as regras), buscar conteúdo, remover (lógico) |
| `anexos-bens.test.ts` | Assinaturas, tamanho e schema — sem banco |

## Funções públicas

| Função | Assinatura real | Descrição |
|---|---|---|
| `listar` | `listar(escopo: EscopoLeitura): Promise<AnexoBemMeta[]>` | Metadados dos anexos ativos das unidades do solicitante; **nunca** o `conteudo` |
| `criar` | `criar(input, criadoPorId, tenantId, escopo): Promise<ResultadoCriacao>` | Valida tamanho real → assinatura → cota do bem; violação volta `{ ok: false, erro }` (vira 400), não exceção |
| `buscarConteudo` | `buscarConteudo(id, escopo): Promise<AnexoBemConteudo \| null>` | `{ nome, mimeType, conteudo }` de um anexo ativo dentro do escopo |
| `remover` | `remover(id, deletadoPorId, escopo): Promise<boolean>` | Remoção lógica (`deletadoEm`/`deletadoPorId`); `false` se não existe ou está fora do escopo |

## Regras de negócio

- **Teto por arquivo: 3 MB** (`MAX_ARQUIVO_BYTES`). Não é arbitrário: o anexo viaja em JSON
  base64 e a Vercel recusa corpo acima de ~4,5 MB — 3 MB viram ~4,19 MB codificados.
  **Aumentar exige trocar o transporte** (upload direto para storage ou envio em partes),
  não só mexer na constante.
- **Cota por bem: 30 MB** (`MAX_TOTAL_POR_BEM_BYTES`), somando apenas os anexos ativos e
  visíveis no escopo de quem envia — a mesma lista que o modal mostra.
- **Tipo validado pelos bytes**, não pelo `mimeType` do cliente. A checagem é por família
  (docx/xlsx = ZIP, doc/xls = OLE2, texto = ausência de assinatura binária), então ela barra
  "executável rotulado como PNG", não troca de extensão dentro da mesma família.
- **Tamanho gravado é o calculado do base64**, nunca um número enviado pelo cliente.
- Remoção é lógica: o registro (quem anexou, quem removeu) fica para auditoria e o conteúdo
  continua no banco; o anexo some das listas e libera cota.

## Modelos de banco

`AnexoBem` → tabela `anexos_bens` (migration `20260814150000_add_anexos_bens`).

| Campo | Observação |
|---|---|
| `trilogoAssetId` | Chave do bem no ERP — o vínculo real |
| `patrimony`, `companyId` | Snapshots: identificam o bem mesmo se ele sair do Trilogo |
| `conteudo` | base64 puro, **sem** o prefixo `data:` |
| `tamanhoBytes` | Calculado no servidor a partir do base64 |
| `tenantId` | Nullable, como em `AgendamentoManutencao`: `super_admin` sem unidade grava `null` |
| `deletadoEm` / `deletadoPorId` | Remoção lógica |

## Rotas de API que usam este módulo

| Método + caminho | Roles (guard real) | O que faz |
|---|---|---|
| `GET /api/bens/anexos` | `super_admin, tenant_admin, admin_multi, viewer` (`verifyAuth` + `assertSistema('linensistem')`) | Metadados dos anexos no escopo, para montar a contagem por bem na tabela |
| `POST /api/bens/anexos` | idem | Cria o anexo; `400` com mensagem legível quando o arquivo/cota não passa |
| `GET /api/bens/anexos/[id]` | idem | Conteúdo em base64 (JSON), lido sob demanda ao baixar |
| `DELETE /api/bens/anexos/[id]` | idem | Remoção lógica |

Os papéis são exatamente os do painel `/admin` (`ADMIN_PANEL_ROLES` no middleware) — anexar e
remover documento de patrimônio é ação administrativa. `operator_patrimonio` não entra em
`/admin/bens` e por isso não está na lista.

## Consumo no client

- `src/services/anexos-bens.service.ts` — `listar`, `criar`, `remover`, `buscarConteudo`.
- `src/app/admin/bens/page.tsx` — query `['anexos-bens']`, monta o mapa por `trilogoAssetId`
  e passa a contagem para cada linha.
- `src/app/admin/bens/components/BemRow.tsx` — coluna **Anexos** (clipe + contagem).
- `src/app/admin/bens/components/ModalAnexos.tsx` — envio, barra de cota, download e remoção;
  importa os limites de `anexos-bens.types.ts` para validar antes de gastar o upload.

## Padrões aplicados

- Escopo obrigatório em toda query (`filtroEscopo(escopoLeitura(session))`), inclusive na soma
  da cota — pelo mesmo motivo de `listarRealizadasPorAssets`: id de bem do Trilogo é sequencial
  numa instância compartilhada entre hospitais e seria enumerável sem filtro.
- Metadado e conteúdo separados: listar é barato, baixar é sob demanda (mesma ideia de
  `FotoLazy` e de `/api/ambientes/[id]/foto`).
- Regra de negócio violada → resultado tipado `{ ok: false }` no service → `badRequest` na rota.
  A rota não decide nada.

## Observações e cuidados

- Anexo criado por `super_admin` sem unidade ativa fica com `tenantId = null` e **não aparece**
  para `tenant_admin`/`admin_multi` (o filtro deles exige `tenantId`). Mesmo comportamento de
  `AgendamentoManutencao` — para anexar "dentro" de uma unidade, o `super_admin` precisa estar
  com a unidade ativa (header `x-tenant-id`).
- O conteúdo removido logicamente continua ocupando espaço no banco. Se um dia isso pesar, a
  limpeza é um job que zera `conteudo` de registros com `deletadoEm` antigo — o registro de
  auditoria continua de pé.
- A lista global (`GET /api/bens/anexos`) devolve metadados de todos os bens do escopo. Para
  `super_admin` isso é cross-tenant por definição; o volume é pequeno (sem `conteudo`), mas se
  a base crescer muito, o próximo passo é filtrar por `assetIds` como em
  `/api/manutencoes/realizadas`.
