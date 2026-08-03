# `src/components` — Catálogo de componentes

Regra da camada: **props in, events out**. Componentes não fazem `fetch`, não
usam hooks de rede e não conhecem services — recebem dados prontos e emitem
eventos por callback. Exceções documentadas: `camera-view.tsx` e
`face-api-preloader.tsx` (efeitos WebRTC/ML), `ActiveTenantSync.tsx` (efeito de
sincronização de estado global do cliente) e os `FotoLazy*` (buscam a própria
foto sob demanda via hook/service — exceção deliberada ao "sem fetch" para não
trafegar base64 nas listagens).

---

## Raiz (`src/components/`)

| Componente | Props | Uso |
|------------|-------|-----|
| `camera-view.tsx` (`CameraView`) | `capturing: boolean`, `onDescriptor: (descriptor: number[]) => void`, `onError?`, `label?` | Feed de câmera + extração do descritor facial 128-dim (face-api.js). Efeito colateral WebRTC permitido |
| `face-api-preloader.tsx` (`FaceApiPreloader`) | — | Pré-carrega os modelos TensorFlow do face-api no mount |
| `ActiveTenantSync.tsx` | `tenantId: string` | Montado em `[tenantSlug]/layout`; grava a "unidade ativa" (`services/active-tenant`) que vira o header `x-tenant-id` das chamadas — essencial para `admin_multi` |

## `ui/` — Primitivos

| Componente | Props principais |
|------------|------------------|
| `Button.tsx` | `variant`, `size` (CVA) + atributos nativos de `<button>` |
| `Card.tsx` | `glass?`, `padding?: 'none'\|'sm'\|'md'\|'lg'`, `shadow?: 'none'\|'sm'\|'md'\|'lg'`, `className?` |
| `Input.tsx` | `label?`, `error?` + atributos nativos de `<input>` |
| `Text.tsx` | `as?` (tag), `variant` (CVA de tipografia), `className?` |
| `Header.tsx` | `title: string`, `backHref?: string` — barra superior da página |
| `LogoutButton.tsx` | — (chama logout e redireciona para `/login`) |
| `MudarSenhaBanner.tsx` | — (banner quando `mustChangePassword`) |
| `CheckFeedback.tsx` | `show: boolean`, `variant?: 'icon'\|'card'` — check animado de confirmação |
| `FotoCapture.tsx` | `label`, `valor: string \| null` (base64), `onChange(base64 \| null)`, `hint?`, `disabled?`, `accent?: 'red'\|'green'\|'purple'\|'amber'` — captura+preview de foto |
| `FotoLightbox.tsx` | `fotos: FotoAmpliavel[]`, `indice: number \| null` (null = fechado), `onFechar`, `onNavegar?` — modal de foto ampliada, único para todo o app |
| `ExportarPdfButton.tsx` | `onClick`, `label?`, `disabled?` |
| `SeletorAmbientePorBloco.tsx` | `blocos`, `carregando`, `onSelecionar(ambiente)`, `search?`/`onSearchChange?` (busca controlada opcional) — tela de seleção reusada por ronda, manutenção e chamados |

## `ui/ronda/` — Rondas de ocorrência

| Componente | Props | Uso |
|------------|-------|-----|
| `RondaCard.tsx` | `ronda: Ronda`, `mostrarTenant?`, `mostrarDono?`, `agruparAmbientes?`, `renderAmbiente?` | Card-resumo de uma ronda (histórico) |
| `RondaCardAdmin.tsx` | `ronda: Ronda` | Variante do painel admin |
| `OcorrenciaCard.tsx` | `oc: OcorrenciaDetalhe` | Card de uma ocorrência dentro da ronda |
| `OcorrenciaRow.tsx` | `oc: OcorrenciaFlat` | Linha da lista desnormalizada (`lib/rondas-admin-utils`) |
| `AmbienteOcorrenciaRow.tsx` | `ambiente: RegistroAmbiente` | Linha de ambiente com ocorrência |
| `GrupoAmbientes.tsx` | `titulo`, `ambientes: RegistroAmbiente[]`, `variante: 'normal'\|'ocorrencia'` | Agrupa ambientes (colapsável) |
| `FotoLazy.tsx` | `ocorrenciaId: string` | Carrega a foto base64 sob demanda (IntersectionObserver) |
| `StatusBadge.tsx` | `ronda: Ronda` | Badge Em andamento/Conforme/Com ocorrências |
| `KpiCard.tsx` | `label`, `value`, `icon: LucideIcon`, `iconBg?`, `iconColor?`, `valueColor?`, `highlight?` | Tile de KPI dos dashboards |
| `RondaEmAndamentoBanner.tsx` | callbacks retomar/descartar | Banner de draft pendente |

## `ui/inspecao/` — Inspeção de gases

| Componente | Props |
|------------|-------|
| `RodadaCard.tsx` | `rodada: RodadaInspecao` |
| `AmbienteCard.tsx` | `amb: AmbienteInspecionado` (pureza O2, pressões, backup, abastecimento, alteração) |
| `GrupoAmbientesInspecao.tsx` | `titulo`, `ambientes: AmbienteInspecionado[]`, `variante: 'normal'\|'ocorrencia'` |
| `FotoLazyAmbiente.tsx` | `ambienteId: string` — foto da alteração, lazy |

## `ui/chamados/` — Chamados

| Componente | Props |
|------------|-------|
| `ChamadoCard.tsx` | `chamado: ChamadoResumo`, `podeEscrever`, `ehAdmin`, `usuarios?`, `busy?`, `mostrarTenant?`, `onAssumir(id, prioridade?)` + callbacks de atribuir/finalizar/cancelar/fiscal |
| `ChamadoBadges.tsx` | `StatusChamadoBadge({ status })`, `PrioridadeChamadoBadge({ prioridade })` |
| `FotoLazyChamado.tsx` | `chamadoId: string` — fotos de abertura/execução, lazy |

## `ui/modal/` — Modais

Todos controlados por `useState` do chamador, renderizados via React Portal,
nunca por rota.

| Componente | Props |
|------------|-------|
| `ModalCriarTenant.tsx` | `open`, `onClose`, `onCreated` |
| `ModalCriarUsuario.tsx` | `open`, `defaultRole?: 'tenant_admin'\|'operator'`, `fixedTenantId?`, `showUnitSelector?`, `allowAdminMulti?` (super_admin cria admin multi-unidade com unidades extras), `onClose`, `onCreated` |
| `ModalConfirmarReset.tsx` | `open`, `nome`, `onConfirm`, `onClose`, `loading?` |
| `ModalFinalizarChamado.tsx` | `chamado: ChamadoResumo \| null` (null = fechado), `loading?`, `erro?`, `onConfirmar({ descricaoExecucao, fotoExecucao })`, `onClose` |
| `ModalCancelarChamado.tsx` | `chamado: ChamadoResumo \| null`, `loading?`, `erro?`, `onConfirmar(motivo?)`, `onClose` |

## `ui/patrimonio/` — Patrimônio

| Componente | Props |
|------------|-------|
| `BemSelector.tsx` | `ambienteNome?`/`blocoNome?` (abre filtrado pelo ambiente com botão "Outro setor"), `onSelecionar(bem \| null)`, `onFechar`, flag p/ ocultar "continuar sem bem" |

> Divergência do CLAUDE.md: `FiltrosPatrimonio.tsx` e `TicketRow.tsx` foram
> **removidos** junto com a tela de tickets Trilogo do painel (substituída pelo
> painel de manutenções e pela importação de tickets como chamados).
