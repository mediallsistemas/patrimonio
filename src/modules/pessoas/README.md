# Módulo `pessoas`

> Cadastro de pessoas do Hotelaria com descritor facial (128-dim, JSON) e CPF único por tenant.

## Responsabilidade

CRUD de `Pessoa` para o fluxo de reconhecimento facial do Hotelaria: criação com deduplicação por `(tenantId, cpf)`, listagem administrativa, resolução de tenant por slug (para terminais públicos sem login) e a query enxuta `buscarPessoasParaFaceMatch`, que alimenta o módulo `face-match`. Nunca armazena imagem do rosto — apenas o descritor serializado.

## Arquivos

| Arquivo | Papel |
|---|---|
| `pessoas.service.ts` | Queries Prisma: listar, buscar, criar (com checagem de conflito de CPF), deletar, resolver tenant por slug, buscar pessoas para face match |
| `pessoas.types.ts` | `CreatePessoaSchema` (Zod) + tipo `CreatePessoaInput` |

## Funções públicas

| Função | Assinatura real | Descrição |
|---|---|---|
| `listarPessoas` | `(tenantId: string \| null)` | Lista `id, nome, cpf, criadoEm, tenantId` (sem `faceDescriptor`); `null` = todas (super_admin) |
| `resolverTenantPorSlug` | `(tenantSlug: string)` | `tenant.findUnique({ where: { slug } })` via `prismaAuth` (alias do prisma principal em `lib/db-auth.ts`) |
| `buscarPessoasParaFaceMatch` | `(tenantId: string \| null) => Promise<Array<{ id; faceDescriptor; nome; cpf; criadoEm }>>` | Select explícito, só o necessário para o matching |
| `buscarPessoa` | `(id: string)` | `findUnique` — retorna `id, nome, cpf, criadoEm` (**sem filtro de tenant**) |
| `deletarPessoa` | `(id: string)` | `$transaction`: `movimentacao.deleteMany({ pessoaId })` + `pessoa.delete` — hard delete em cascata (**sem filtro de tenant**) |
| `criarPessoa` | `(input: CreatePessoaInput, tenantId: string)` | Limpa CPF (`replace(/\D/g,'')`), checa `tenantId_cpf`; retorna `{ conflict: true, pessoa }` ou `{ conflict: false, pessoa }`; grava `faceDescriptor: JSON.stringify(input.faceDescriptor)` |

Schema Zod (`CreatePessoaSchema`): `nome` 2–120 chars, `cpf` regex `^\d{11}$`, `faceDescriptor` `z.array(z.number()).min(128)`, `tenantSlug` opcional.

## Modelos de banco

| Modelo Prisma | Tabela (`@@map`) | Campos-chave | Índices |
|---|---|---|---|
| `Pessoa` | `pessoas` | `id (uuid)`, `nome`, `cpf`, `faceDescriptor (String — JSON de 128 floats)`, `tenantId`, `criadoEm`, `atualizadoEm` | `@@unique([tenantId, cpf])`, `@@index([tenantId])` |

## Rotas de API que usam este módulo

| Rota | Roles (verifyAuth real) | O que faz |
|---|---|---|
| `GET /api/pessoas` | `['super_admin', 'tenant_admin']` | Lista pessoas (super_admin vê todas: `tenantId = null`) |
| `POST /api/pessoas` | Auth **opcional**: tenta `verifyAuth`; sem sessão, resolve tenant via `tenantSlug` do body (terminal público) | Valida com `CreatePessoaSchema.safeParse`; `409 conflict` se CPF já existe no tenant |
| `GET /api/pessoas/[id]` | **nenhum `verifyAuth` na rota** (só o cookie exigido pelo middleware) | Retorna a pessoa por id, sem checar tenant |
| `DELETE /api/pessoas/[id]` | **nenhum `verifyAuth` na rota** | Hard delete da pessoa + todas as movimentações |
| `POST /api/hotelaria/[tenantSlug]/pessoas` | **pública — sem auth** (middleware libera `/api/hotelaria/*`) | Cadastro pelo terminal: validação manual (nome/cpf/faceDescriptor presentes, CPF 11 dígitos), `criarPessoa` no tenant do slug |
| `POST /api/hotelaria/[tenantSlug]/verificar-face` | **pública — sem auth** | Usa `resolverTenantPorSlug` + `buscarPessoasParaFaceMatch` (matching descrito no README do `face-match`) |

## Consumo no client

Fluxo de cadastro facial (`src/app/[tenantSlug]/hotelaria/cadastro/page.tsx` e a variante legada `[tenantSlug]/cadastro`):

1. `FaceApiPreloader` (montado em `/[tenantSlug]/hotelaria/page.tsx`) pré-carrega os modelos face-api.js (`tinyFaceDetector`, `faceLandmark68Net`, `faceRecognitionNet`) de `/models` e marca `window.__faceApiModelsLoaded`.
2. `camera-view.tsx` abre a webcam (320×240, `facingMode: 'user'`), roda `detectSingleFace` a cada 500 ms (`TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 })`) `.withFaceLandmarks().withFaceDescriptor()` e entrega `Array.from(result.descriptor)` — o descritor de 128 floats.
3. A página envia `api.post('hotelaria/${tenantSlug}/pessoas', { nome, cpf, faceDescriptor })`.
4. O service serializa o descritor com `JSON.stringify` e persiste; conflito de CPF → 409.

Nenhuma imagem sai do browser — só o vetor numérico.

## Padrões aplicados

- **Zod no boundary autenticado:**
  ```ts
  const parsed = CreatePessoaSchema.safeParse(await req.json())
  if (!parsed.success) return badRequest(...)
  ```
- **Descritor facial como JSON, nunca imagem crua:**
  ```ts
  faceDescriptor: JSON.stringify(input.faceDescriptor)
  ```
- **Unicidade por tenant:** lookup em `tenantId_cpf` antes do create (retorno tipado `conflict: true as const`).
- **Isolamento por tenant nas listagens:** `where = tenantId ? { tenantId } : {}` (aberto só para super_admin).

## Observações e cuidados

- **LGPD — dado biométrico:** `faceDescriptor` é dado biométrico (dado pessoal sensível) e `cpf` é PII. Não logar, não expor em respostas além do necessário (`listarPessoas` e `buscarPessoa` já omitem o descritor; `buscarPessoasParaFaceMatch` o retorna apenas para uso interno do matching — nunca repassar ao client).
- **Divergência — `GET/DELETE /api/pessoas/[id]` sem `verifyAuth` e sem filtro de tenant:** qualquer sessão válida (o middleware só exige cookie) pode ler/deletar pessoa de **qualquer tenant** conhecendo o UUID. `deletarPessoa` é hard delete em cascata das movimentações, sem auditoria (`deletadoEm`/`criadoPorId` não existem no modelo).
- **Divergência — rota pública de hotelaria sem Zod:** `POST /api/hotelaria/[tenantSlug]/pessoas` valida manualmente, não usa `CreatePessoaSchema` (contraria "Zod at every API boundary" do CLAUDE.md); em particular não valida o tamanho do `faceDescriptor`.
- **Divergência de schema entre módulos:** `CreatePessoaSchema` aceita descritor com `.min(128)` (≥128), enquanto `VerificarFaceSchema` (face-match) exige `.length(128)` exato.
- Rate limiting das rotas `/api/hotelaria/*`: ver observação no README do `face-match` — a regra de 20 req/min existe no middleware mas hoje não é efetivamente aplicada a esse caminho.
- `Pessoa` não tem `criadoPorId` — divergência dos audit fields do CLAUDE.md (justificável: cadastro é operação pública de terminal).
