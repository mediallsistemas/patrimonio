# Módulo `face-match`

> Comparação de descritores faciais 128-dim por distância euclidiana (threshold 0.6) para identificar pessoas no Hotelaria.

## Responsabilidade

Lado servidor do reconhecimento facial: recebe um descritor de 128 floats gerado no browser (face-api.js), compara com os descritores armazenados em `Pessoa.faceDescriptor` (JSON) e devolve o melhor match abaixo do threshold, junto com a contagem de retiradas pendentes da pessoa. O matching em si é função pura (sem I/O); só `buscarPendentes` toca o banco.

## Arquivos

| Arquivo | Papel |
|---|---|
| `face-match.service.ts` | `euclideanDistance`, `encontrarMelhorMatch` (puras) e `buscarPendentes` (Prisma `groupBy`) |
| `face-match.types.ts` | `VerificarFaceSchema` (Zod), `PessoaFace`, `ResultadoFaceMatch` (união discriminada `encontrado: true/false`) |

## Funções públicas

| Função | Assinatura real | Descrição |
|---|---|---|
| `euclideanDistance` | `(a: readonly number[], b: readonly number[]) => number` | `sqrt(Σ (aᵢ−bᵢ)²)` |
| `encontrarMelhorMatch` | `(descriptor: readonly number[], pessoas: readonly PessoaFace[], threshold = 0.6) => PessoaFace \| null` | Faz `JSON.parse` de cada `faceDescriptor` (descritor inválido gera `console.warn` e é pulado), guarda a menor distância `< threshold`; `null` se ninguém passou |
| `buscarPendentes` | `(pessoaId: string, tenantId?: string) => Promise<number>` | `groupBy(['tipo'])` em `movimentacoes`; retorna `max(0, retiradas − devoluções)` |

**Threshold real: `const THRESHOLD = 0.6`** (constante do service, sem env var), o valor padrão recomendado do face-api.js.

Schema Zod (`VerificarFaceSchema`): `descriptor` `z.array(z.number()).length(128)` (exatamente 128), `tenantSlug` opcional.

## Modelos de banco

O módulo não define modelos próprios; lê:

| Modelo Prisma | Tabela (`@@map`) | Campos-chave | Índices |
|---|---|---|---|
| `Pessoa` | `pessoas` | `faceDescriptor (String — JSON de 128 floats)`, `nome`, `cpf`, `tenantId` | `@@unique([tenantId, cpf])`, `@@index([tenantId])` |
| `Movimentacao` | `movimentacoes` | `pessoaId`, `tipo`, `tenantId` | inclui `[pessoaId, tipo]` (cobre o `groupBy` de pendentes) |

## Rotas de API que usam este módulo

| Rota | Roles (verifyAuth real) | O que faz |
|---|---|---|
| `POST /api/hotelaria/[tenantSlug]/verificar-face` | **pública — sem auth** (middleware libera `/api/hotelaria/*` explicitamente) | `VerificarFaceSchema.safeParse` → resolve tenant pelo slug → `buscarPessoasParaFaceMatch(tenant.id)` (módulo `pessoas`) → `encontrarMelhorMatch` → se achou, `buscarPendentes(match.id, tenant.id)` → `{ encontrado, pessoa: { id, nome, cpf, criadoEm }, pendentes }` |

## Consumo no client — fluxo de ponta a ponta

1. **Preload:** `src/components/face-api-preloader.tsx` (montado em `/[tenantSlug]/hotelaria/page.tsx`) importa `face-api.js` dinamicamente e carrega de `/models` os 3 modelos — `tinyFaceDetector`, `faceLandmark68Net`, `faceRecognitionNet` — marcando `window.__faceApiModelsLoaded` para não recarregar.
2. **Captura:** `src/components/camera-view.tsx` abre a webcam via `getUserMedia` (320×240, `facingMode: 'user'`) em paralelo ao carregamento dos modelos. Com `capturing` ativo, roda a cada **500 ms** `detectSingleFace(video, TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 })).withFaceLandmarks().withFaceDescriptor()`.
3. **Descritor:** no primeiro frame com rosto, chama `onDescriptor(Array.from(result.descriptor))` — um `Float32Array` de 128 posições vira `number[]`. Nenhuma imagem é enviada.
4. **POST:** as páginas `/[tenantSlug]/hotelaria/retirada` e `.../devolucao` (e as legadas `/[tenantSlug]/retirada|devolucao`) fazem `api.post('hotelaria/${tenantSlug}/verificar-face', { descriptor })`.
5. **Matching no servidor:** a rota carrega **todas** as pessoas do tenant e compara em memória por distância euclidiana; match = menor distância `< 0.6`.
6. **Resposta:** `{ encontrado: true, pessoa, pendentes }` → a UI mostra a pessoa e, confirmando, registra a movimentação (`retirada`/`devolucao`) — ver README de `movimentacoes`.

## Padrões aplicados

- **Rota pública + Zod:** sem `verifyAuth`, mas o boundary valida forma e tamanho do input:
  ```ts
  const parsed = VerificarFaceSchema.safeParse(await req.json())
  if (!parsed.success) return badRequest(...)
  ```
- **Isolamento por tenant:** o escopo vem do `tenantSlug` da URL (`resolverTenantPorSlug`), e `buscarPendentes` recebe `tenantId` explícito — o matching nunca cruza tenants.
- **Descritor como JSON, nunca imagem crua:** o banco guarda só o vetor; `JSON.parse` defensivo com `continue` em registro corrompido.
- **União discriminada** no retorno (`ResultadoFaceMatch`), em vez de flags booleanas soltas.

## Observações e cuidados

- **LGPD — dado biométrico sem autenticação:** a rota é pública por design (terminal de parede). Qualquer um que conheça um `tenantSlug` pode enviar descritores e, num match, receber `nome`, **CPF completo** e `criadoEm` da pessoa. Combinado ao threshold 0.6 (permissivo), isso permite enumeração/identificação de pessoas cadastradas — avaliar mascarar o CPF na resposta.
- **Rate limiting — regra existe mas não é aplicada:** `src/middleware.ts` declara `{ path: '/api/hotelaria', maxReqs: 20, windowMs: 60_000 }` em `RATE_LIMIT_RULES` (20 req/min por IP, "public biometric endpoints"). Porém o regex de módulos públicos `/^\/[a-z0-9-]+\/(hotelaria|retirada|cadastro|devolucao)(\/|$)/` casa também com `/api/hotelaria/...` (primeiro segmento "api") e retorna `NextResponse.next()` **antes** de qualquer chamada a `checkRateLimit` — e também antes do `applyCors`. Na prática a regra de 20/min é código morto para esse caminho, e o branch dedicado `if (pathname.startsWith('/api/hotelaria/'))` mais abaixo é inalcançável. Divergência real entre intenção documentada e comportamento.
- **Escala linear:** o matching é O(n) carregando todos os descritores do tenant em memória a cada verificação — aceitável para centenas de pessoas, revisar antes de milhares.
- **Threshold fixo no código:** o comentário do CLAUDE.md diz "threshold configurável", mas não há configuração — é a constante `0.6`; `encontrarMelhorMatch` aceita um terceiro parâmetro, nunca usado pelas rotas.
- Divergência de validação com o cadastro: aqui o descritor exige exatamente 128 valores (`.length(128)`); `CreatePessoaSchema` aceita `.min(128)`.
