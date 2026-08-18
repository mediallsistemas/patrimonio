# `src/services` — Client services (fetch wrappers)

Camada de HTTP do cliente: funções finas que chamam `/api/*` e tipam a resposta.
**Sem lógica de negócio.** Consumidos apenas por hooks e páginas client — nunca
por `modules/` (server). Todos (exceto `active-tenant.ts`) passam pelo wrapper
`api.ts`.

---

## `api.ts` — wrapper fetch central

```ts
export const api = {
  get:    <T>(endpoint: string) => Promise<T>,
  post:   <T>(endpoint: string, body: unknown) => Promise<T>,
  patch:  <T>(endpoint: string, body: unknown) => Promise<T>,
  delete: <T>(endpoint: string) => Promise<T>,
}
```

Comportamento (função interna `request<T>`):

- **Base:** prefixa `/api/` — os services passam endpoints relativos (`'chamados'`,
  `'rondas/draft'`).
- **Headers:** `Content-Type: application/json` + **`x-tenant-id`** com a "unidade
  ativa" (`getActiveTenantId()` de `active-tenant.ts`) quando definida — o servidor
  só honra o header se a sessão tiver acesso ao tenant (admin_multi); para os
  demais é ignorado.
- **Credenciais:** `credentials: 'include'` em toda chamada — o cookie httpOnly
  `ls_session` é o mecanismo de auth; nenhum service manda Bearer token.
- **Erros:** se `!response.ok`, lê o JSON do corpo (tolerante a corpo inválido) e
  lança **`ApiError(status, message)`** (`@/lib/error-message`), usando
  `json.error ?? json.message ?? 'HTTP <status>'`. Hooks convertem para mensagem
  amigável com `toUserMessage()`.
- **Sucesso:** retorna `response.json()` tipado como `T`. O envelope do servidor é
  `{ data: T, message? }` (sucesso) / `{ error, details? }` (erro) — **o wrapper
  não desembrulha `data`**; cada service faz o unwrap (`json.data`, helpers
  `unwrap()`, ou o padrão defensivo `'data' in json ? json.data : json` em
  services mais antigos).

## `active-tenant.ts` — unidade ativa (não é fetch wrapper)

```ts
setActiveTenantId(id: string | null): void   // grava em memória + sessionStorage ('ls_active_tenant')
getActiveTenantId(): string | null           // reidrata de sessionStorage; SSR-safe
```

Alimentado por `components/ActiveTenantSync.tsx` (montado em
`[tenantSlug]/layout`): mantém o header `x-tenant-id` apontando para a unidade
que o usuário está visualizando — essencial para `admin_multi`.

---

## Catálogo de services

| Arquivo | Endpoints | Principais funções |
|---------|-----------|--------------------|
| `auth.service.ts` | `auth/login`, `auth/logout` | `login({ email, senha }): Promise<LoginResponse>` (retorna `usuario.role/tenantSlug/mustChangePassword`), `logout()` |
| `versao.service.ts` | `versao` | `buscarVersaoServidor(): Promise<string \| null>` — SHA do build no servidor; **`fetch` cru com `cache: 'no-store'`** (rota pública, fora do wrapper `api`); `null` em erro |
| `rondas.service.ts` | `rondas`, `rondas/{id}`, `rondas/{id}/ambientes`, `rondas/draft`, `me/blocos`, `admin/blocos`, `tenants/{slug}/ambientes`, `ocorrencias/{id}/foto` | `listar()`, `criar()`, `finalizar(id)`, `registrarAmbiente(id, body)`, `buscarDraft()`, `salvarDraftAPI(estado)` (**usa `fetch` direto com PUT** — único fora do wrapper), `descartarDraftAPI()`, `buscarBlocos()`, `buscarBlocosAdmin(tenantId)`, `buscarAmbientesTenant(slug)`, `buscarFotoOcorrencia(id)` |
| `rodadas.service.ts` | `rodadas`, `rodadas/{id}`, `rodadas/{id}/ambientes` | `listar()`, `criar()`, `finalizar(id)`, `registrarAmbiente(id, body)` (inspeção de gases) |
| `chamados.service.ts` | `chamados`, `chamados/{id}`, `chamados/{id}/{assumir\|atribuir\|finalizar\|cancelar\|foto}`, `chamados/dashboard` | `listar(filtros)` (status/prioridade/tipo/responsavelId/atrasados/`tenantId`/`comBem` via querystring), `buscar(id)`, `criar(input)`, `assumir(id, prioridade?)`, `atribuir(id, responsavelId, prioridade?)`, `finalizar(id, input)`, `cancelar(id, motivo?)`, `editarFiscal(id, input)`, `buscarFotos(id)`, `dashboard({de, ate, tenantId}?)`. Reexporta tipos de `modules/chamados/chamados.types` (client-safe). `ChamadoResumo` inclui `trilogoTicketId`/`trilogoStatusOrigem` (chamados importados do Trilogo) e campos fiscais presentes só para admin |
| `manutencoes.service.ts` | `me/manutencoes`, `me/manutencoes/{id}/finalizar`, `me/bens/buscar`, `manutencoes/realizadas`, `manutencoes/historico` | `iniciar(input)` (union `IniciarAmbienteInput` eletrica/hidraulica × `IniciarPatrimonioInput`), `finalizar(id, { fotoDepois, observacaoFinal? })`, `listarEmAberto()` (em aberto da unidade, p/ retomar/finalizar — `ManutencaoEmAberto`), `buscarBemPorPatrimonio(patrimony)`, `listarRealizadasPorAssets(assetIds)`, `buscarRealizadaDetalhe(id)`, `listarHistorico()` |
| `me.service.ts` | `me/tenant`, `me/tenants` | `buscarMeuTenant()`, `buscarMeusTenants()` (`MyTenant`: id, slug, nome, trilogoCompanyId, trilogoProjectName) |
| `agendamentos.service.ts` | `agendamentos` | `listar(): Promise<Agendamento[]>` |
| `anexos-bens.service.ts` | `bens/anexos`, `bens/anexos/{id}` | `listar()` (só metadados), `criar(input)` (base64 sem prefixo `data:`), `remover(id)`, `buscarConteudo(id)` (sob demanda, ao baixar). Limites em `modules/anexos-bens/anexos-bens.types.ts` |
| `trilogo.service.ts` | `trilogo/assets` | `buscarEmpresas()`, `buscarProjetos(companyId)`, `buscarAssets(companyId)` |
| `admin-tenants.service.ts` | `admin/tenants`, `me/tenants` | `listarTenants()`, `listarMeusTenants()` (fonte canônica dos seletores de unidade: super_admin → todas; admin_multi → as suas), `criarTenant(input)` |
| `admin-usuarios.service.ts` | `admin/usuarios`, `admin/usuarios/{id}/reset-password` | `listarUsuarios()`, `criarUsuario(input)` (`tenantsExtras?: string[]` p/ admin_multi), `resetSenhaUsuario(id)` |
| `admin-rondas.service.ts` | `admin/rondas` | `listarRondas(): Promise<Ronda[]>` (cross-tenant, escopo aplicado no servidor) |
| `admin-manutencoes.service.ts` | `admin/manutencoes` | `listarManutencoesAdmin()`. `TipoManutencaoAdmin` inclui `'predial'` — tipo que existe no banco mas não no comentário do schema |
| `admin-dashboard.service.ts` | `admin/dashboard?tenantId=` | `buscarMetricas(tenantId): Promise<TenantDashboardStats>` (hotelaria) |

Arquivos de tipos (sem fetch): `rondas.types.ts` (`Ronda`, `RegistroAmbiente`,
`OcorrenciaDetalhe`, `RondaTenant`, `CriadoPor`) e `inspecao.types.ts`
(`RodadaInspecao`, `AmbienteInspecionado`, `Abastecimento`, `Alteracao`).

> Removido: `admin-patrimonio.service.ts` (tickets Trilogo do painel) — substituído
> por `admin-manutencoes.service.ts` + importação de tickets como chamados
> (`modules/chamados/chamados-sync.service`).

---

## Convenções

- Unwrap do envelope: services novos usam `unwrap()` local; antigos aceitam
  `{ data: T } | T` por compatibilidade. Ao criar service novo, tipar como
  `{ data: T }` e desembrulhar.
- Fotos pesadas nunca vêm na listagem — sempre endpoint próprio (`.../foto`)
  consumido por componentes `FotoLazy*` via hooks.
- Erro sempre propaga como `ApiError` — tratar no hook com `toUserMessage`.
