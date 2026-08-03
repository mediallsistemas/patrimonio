# `src/hooks` — Hooks de estado e dados (client)

Camada entre páginas/componentes e os `src/services/*` (fetch wrappers).
Regras: hooks nunca chamam Prisma nem importam `lib/` server-only; componentes
não fazem fetch — consomem hooks.

**Padrão de estado — dois estilos convivem no código:**

- **`useState` + services** (estilo original): `useAuth`, `useLogin`, `useRondaBase`,
  `useRonda`, `useOcorrenciaRonda`, `useInspecao`, `useAdminTenants`, `useAdminUsuarios`.
- **TanStack Query v5** (domínios mais novos): `useChamados`, `useManutencao`.

> Divergência do CLAUDE.md: nem todo hook usa TanStack Query; o catálogo lá
> ainda cita `usePatrimonio`, que foi **removido** junto com a tela de tickets
> de patrimônio (substituída pelo painel de manutenções — `admin-manutencoes.service`).

---

## Tabela de hooks

| Arquivo | Exports | Estado | Services consumidos | O que expõe |
|---------|---------|--------|---------------------|-------------|
| `useAuth.ts` | `useAuth` | `useState` (union discriminada `AuthState`) | **fetch direto** em `/api/auth/me` e `/api/auth/logout` (não passa por `services/`) | `state`, `user` (JWTPayload), `isLoading`, `isSuperAdmin`, `isAdminMulti` (inclui `viewer` legado), `isViewer`, `logout()`, `refresh()` |
| `useLogin.ts` | `useLogin` | `useState` | `auth.service.login` | `isPending`, `error`, `submit(email, senha, from?)` — redireciona por role (admin → `/admin`; demais → `/{tenantSlug}/manutencao`); força `/mudar-senha` se `mustChangePassword` |
| `useRondaBase.ts` | `useRondaBase({ onIniciar, onAbandonar })` | `useState` + `useRef` (timer de draft) | `rondas.service` (blocos, draft, criar, registrarAmbiente, finalizar) | Máquina de estados completa da ronda: `estado` (DraftEstado), navegação bloco→local, medições de gases, detalhes de ocorrência, foto (redimensiona p/ 1280px JPEG 0.7), progresso, validações, ciclo de draft (abaixo) |
| `useRonda.ts` | `useRonda` | herda de `useRondaBase` | via base | Ronda do operador em `/{tenantSlug}/ronda`; `onIniciar` NÃO cria ronda no servidor (id só no 1º registro de ambiente); `onAbandonar` salva draft e volta para `/{tenantSlug}/manutencao` |
| `useOcorrenciaRonda.ts` | `useOcorrenciaRonda` | herda de `useRondaBase` | `rondas.service.criar` + via base | Variante usada em `/ocorrencias`; `onIniciar` **cria a ronda imediatamente** no servidor; abandono volta para `/` |
| `useInspecao.ts` | `useInspecao` | `useState` **standalone — NÃO estende `useRondaBase`** (divergência do CLAUDE.md) | `rodadas.service` | Fluxo por etapas da inspeção de gases de UM ambiente (slug = ambiente): `etapa`, `medicoes`, `backupLigado`, `abastecimento`, `detalhe`, `resumo`, handlers `handleMedicoesNext/Backup/AbastecimentoNext/SemAlteracao/Trilogo`, `resetForm`. Sem draft. |
| `useChamados.ts` | `useChamados(opts)`, `useFotosChamado(id)`, `useDashboardChamados(periodo)` | **TanStack Query** (`useQuery`/`useMutation`) + `useState` p/ filtros e `busyIds` | `chamados.service`, `rondas.service.buscarBlocos`, `admin-usuarios.service.listarUsuarios` | Lista com `filtros`, `blocosChamado` (sem ambientes gases; `opts.comBlocos`), `usuarios` atribuíveis (`opts.ehAdmin`), mutations `criar/assumir/atribuir/finalizar/cancelar/editarFiscal`, handlers com toast e `busyIds` por card |
| `useManutencao.ts` | `useManutencao` | **TanStack Query** + `useState` (busca) | `manutencoes.service`, `rondas.service.buscarBlocos` | `blocosManutencao` (não-gases), busca de bem por patrimony (`patrimonyQuery` → query habilitada só com texto), mutations `iniciar`/`finalizar` (invalidam `['me-manutencoes']`) |
| `useAdminTenants.ts` | `useTenantsList`, `useCreateTenant`, `useTrilogoEmpresas(enabled)`, `useTrilogoProjetos(companyId)` | `useState` + `useEffect` | `admin-tenants.service`, `trilogo.service` | Lista/criação de tenants; empresas e projetos Trilogo p/ o modal de criação |
| `useAdminUsuarios.ts` | `useUsuarios`, `useTenants(enabled)`, `useCreateUsuario` | `useState` + `useEffect` | `admin-usuarios.service`, `admin-tenants.service` | Lista/criação de usuários (`CreateUsuarioInput` inclui `tenantsExtras` p/ admin_multi) |

Nota de nomenclatura: os arquivos `useAdminTenants.ts` / `useAdminUsuarios.ts`
**não exportam** hooks com esses nomes — exportam os hooks menores listados acima.

---

## Herança `useRondaBase` → `useRonda` / `useOcorrenciaRonda`

`useRondaBase` concentra toda a lógica (draft, navegação, submissão, fotos,
validações) e recebe dois callbacks de especialização:

```ts
useRondaBase({
  onIniciar:   () => Promise<{ rondaId: string | null; estado: DraftEstado }>,
  onAbandonar: (estado, salvarDraft) => void,
})
```

- `useRonda` (operador, rota tenant): inicia com `rondaId: null` — a ronda só é
  criada no servidor no primeiro `salvarLocal` (evita rondas vazias).
- `useOcorrenciaRonda` (rota `/ocorrencias`): cria a ronda no servidor já no início.
- `useInspecao` **não participa** desta herança (fluxo próprio de etapas, sem draft).

---

## Ciclo de draft / auto-recuperação (rondas)

Implementado em `useRondaBase` + `modules/rondas/ronda-draft.service.ts`:

1. **Mount:** `rondasService.buscarDraft()` (`GET /api/rondas/draft`). Se o draft
   tem `rondaId` e `etapa !== 'resumo_final'`, mostra banner "retomar/descartar".
   No servidor, `buscarDraft` antes **expira rondas abertas há >24h** e apaga o
   draft se a ronda já foi finalizada/não existe.
2. **Durante a ronda:** toda mutação de estado (`atualizar`, `atualizarDetalhe`,
   `salvarLocal`…) agenda `salvarDraftAPI(estado)` com **debounce**
   (`DRAFT_DEBOUNCE_MS`, definido em `app/[tenantSlug]/ronda/ronda.types`), via
   `PUT /api/rondas/draft`. Falhas de draft são silenciosas (`.catch(() => {})`).
3. **Retomar:** `retomar()` restaura `draftServidor` para o estado local.
4. **Expiração em uso:** se `registrarAmbiente`/`finalizar` retornam 404/409, o
   hook mostra toast "Esta ronda expirou", descarta o draft e reseta o estado.
5. **Finalizar:** cancela o timer de debounce, `PATCH /api/rondas/{id}`,
   `DELETE /api/rondas/draft`, vai para `etapa: 'resumo_final'`.
6. **Abandonar:** salva o draft imediatamente e navega para fora (toast "Ronda
   pausada").

Chave no banco: `RondaDraft` único por `(tenantId, criadoPorId)` — um draft por
usuário por unidade.
