# LinenSistem — Plano de Integração e Arquitetura
**Branch de trabalho:** `development`
**Data:** 2026-03-19

---

## Contexto

LinenSistem é o sistema principal (Next.js + Prisma). Ele absorverá o backend do
FeedbackForms (NestJS → descartado) e passará a servir uma plataforma unificada
multi-tenant. O FeedbackForms mantém seu frontend SPA (React + Vite) apontando
para as API routes deste Next.js.

---

## Arquitetura de Pastas — Estado Ideal

A estrutura atual está achatada e precisa ser organizada em módulos coesos.
Toda nova feature deve seguir este padrão antes de ser criada.

```
linensistem/
├── app/
│   ├── (public)/                     ← rotas sem autenticação
│   │   ├── [tenantSlug]/
│   │   │   ├── hotelaria/
│   │   │   │   ├── cadastro/page.tsx
│   │   │   │   ├── retirada/page.tsx
│   │   │   │   └── devolucao/page.tsx
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (auth)/                       ← rotas autenticadas por tenant
│   │   ├── [tenantSlug]/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── inspecao/
│   │   │   │   ├── page.tsx
│   │   │   │   └── historico/page.tsx
│   │   │   ├── ocorrencias/
│   │   │   │   ├── page.tsx
│   │   │   │   └── historico/page.tsx
│   │   │   └── manutencao/
│   │   │       ├── page.tsx
│   │   │       └── ocorrencias/
│   │   │           ├── page.tsx
│   │   │           └── historico/page.tsx
│   │   └── layout.tsx
│   │
│   ├── admin/                        ← super admin
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── tenants/page.tsx
│   │   ├── usuarios/page.tsx
│   │   ├── rondas/page.tsx
│   │   ├── bens/page.tsx
│   │   └── patrimonio/page.tsx
│   │
│   ├── login/page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   └── providers.tsx
│
├── api/                              ← todas as API routes organizadas por domínio
│   ├── auth/
│   │   ├── login/route.ts
│   │   ├── logout/route.ts
│   │   └── me/route.ts
│   ├── tenants/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   ├── usuarios/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   ├── pessoas/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   ├── hotelaria/
│   │   └── [tenantSlug]/
│   │       ├── pessoas/route.ts
│   │       ├── movimentacoes/route.ts
│   │       └── verificar-face/route.ts
│   ├── rodadas/
│   │   ├── route.ts
│   │   └── [id]/
│   │       ├── route.ts
│   │       └── ambientes/route.ts
│   ├── rondas/
│   │   ├── route.ts
│   │   └── [id]/
│   │       ├── route.ts
│   │       └── ambientes/route.ts
│   ├── ocorrencias/
│   │   └── [id]/foto/route.ts
│   ├── agendamentos/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   ├── trilogo/
│   │   ├── route.ts
│   │   └── assets/route.ts
│   ├── admin/
│   │   ├── dashboard/route.ts
│   │   ├── rondas/route.ts
│   │   ├── tenants/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── usuarios/
│   │       ├── route.ts
│   │       └── [id]/route.ts
│   │
│   ├── feedback/                     ← NOVO: rotas do FeedbackForms
│   │   ├── form-templates/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── form-responses/
│   │   │   ├── route.ts              ← público (submit de pesquisa)
│   │   │   └── [id]/route.ts
│   │   └── analytics/
│   │       ├── summary/route.ts
│   │       ├── by-period/route.ts
│   │       └── by-department/route.ts
│   │
│   └── ambientes/
│       └── [id]/foto/route.ts
│
├── modules/                          ← NOVO: lógica de negócio por domínio
│   ├── auth/
│   │   ├── auth.service.ts           ← login, geração de JWT, validação
│   │   ├── auth.types.ts             ← tipos JWTPayload, SessionUser
│   │   └── auth.guards.ts            ← helpers de verificação de role/tenant
│   ├── tenants/
│   │   ├── tenant.service.ts
│   │   └── tenant.types.ts
│   ├── usuarios/
│   │   ├── usuario.service.ts
│   │   └── usuario.types.ts
│   ├── pessoas/
│   │   ├── pessoa.service.ts
│   │   └── pessoa.types.ts
│   ├── hotelaria/
│   │   ├── hotelaria.service.ts
│   │   └── hotelaria.types.ts
│   ├── inspecao/
│   │   ├── inspecao.service.ts
│   │   └── inspecao.types.ts
│   ├── ocorrencias/
│   │   ├── ocorrencia.service.ts
│   │   └── ocorrencia.types.ts
│   ├── manutencao/
│   │   ├── manutencao.service.ts
│   │   └── manutencao.types.ts
│   ├── feedback/                     ← NOVO: domínio do FeedbackForms
│   │   ├── form-template.service.ts
│   │   ├── form-response.service.ts
│   │   ├── analytics.service.ts
│   │   └── feedback.types.ts
│   └── admin/
│       ├── admin.service.ts
│       └── admin.types.ts
│
├── components/                       ← componentes reutilizáveis
│   ├── ui/                           ← primitivos genéricos
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── text.tsx
│   │   ├── select.tsx
│   │   ├── textarea.tsx
│   │   ├── badge.tsx
│   │   └── modal/
│   │       ├── modal.tsx
│   │       └── modal-confirm.tsx
│   ├── layout/                       ← estrutura de página
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   └── page-wrapper.tsx
│   ├── feedback/                     ← NOVO: componentes do FeedbackForms
│   │   ├── nps-input.tsx
│   │   ├── rating-input.tsx
│   │   ├── section-header.tsx
│   │   └── sub-reason-panel.tsx
│   └── shared/                       ← componentes de domínio compartilhado
│       ├── camera-view.tsx
│       ├── face-api-preloader.tsx
│       └── logout-button.tsx
│
├── lib/
│   ├── db.ts                         ← instância Prisma (singleton)
│   ├── auth.ts                       ← helpers JWT (signToken, verifyToken)
│   └── api-response.ts               ← NOVO: helpers de resposta padronizada
│
├── types/
│   └── index.ts                      ← tipos globais e enums
│
├── utils/
│   ├── format.ts
│   └── validators.ts                 ← NOVO: validações (CPF, etc.)
│
├── services/                         ← client-side: chamadas fetch para /api
│   ├── api.ts                        ← instância base com auth header
│   ├── auth.service.ts
│   ├── feedback.service.ts           ← NOVO
│   └── ...
│
├── hooks/                            ← NOVO: hooks reutilizáveis
│   ├── use-auth.ts
│   ├── use-tenant.ts
│   └── use-feedback.ts               ← NOVO
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   ├── seed.ts
│   └── scripts/
│
├── public/
│   └── models/                       ← modelos face-api.js
│
├── middleware.ts
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Boas Práticas — Regras de Arquitetura

### 1. Separação de responsabilidades

- **`app/api/*/route.ts`** — apenas recebe request, valida auth, chama o módulo, retorna resposta. Zero lógica de negócio.
- **`modules/*/service.ts`** — toda a lógica de negócio e queries Prisma ficam aqui.
- **`components/`** — componentes são burros (dumb): recebem props, renderizam, emitem eventos. Sem chamadas fetch diretas.
- **`hooks/`** — encapsulam estado + chamadas de serviço. Páginas e componentes consomem hooks.

```
route.ts → module/service.ts → lib/db.ts (Prisma)
page.tsx → hook → services/api.ts → /api/route.ts
```

### 2. Convenções de nomenclatura

| Tipo | Convenção | Exemplo |
|---|---|---|
| Componente React | PascalCase | `ModalConfirm.tsx` |
| Hook | camelCase + prefixo `use` | `useFormResponse.ts` |
| Service (server) | kebab-case + `.service.ts` | `feedback.service.ts` |
| Service (client) | kebab-case + `.service.ts` | `form-response.service.ts` |
| Types | PascalCase, arquivo `.types.ts` | `FeedbackTypes` |
| Rota API | pasta com nome do recurso | `/api/feedback/form-responses/` |

### 3. Tipagem estrita

- **Sem `any`**. Sempre tipar inputs e outputs de funções.
- Tipos de domínio ficam em `modules/*/types.ts` ou `types/index.ts`.
- JWT payload tem tipo explícito `JWTPayload` em `modules/auth/auth.types.ts`.
- Respostas de API têm tipo `ApiResponse<T>` com shape consistente.

### 4. Estrutura de resposta de API padronizada

Toda route.ts retorna o mesmo shape:

```ts
// sucesso
{ data: T, message?: string }

// erro
{ error: string, details?: unknown }
```

Helper em `lib/api-response.ts`:
```ts
export const ok = <T>(data: T, message?: string) =>
  NextResponse.json({ data, message }, { status: 200 })

export const created = <T>(data: T) =>
  NextResponse.json({ data }, { status: 201 })

export const badRequest = (error: string) =>
  NextResponse.json({ error }, { status: 400 })

export const unauthorized = () =>
  NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

export const forbidden = () =>
  NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

export const notFound = (resource = 'Recurso') =>
  NextResponse.json({ error: `${resource} não encontrado` }, { status: 404 })

export const serverError = (error: unknown) =>
  NextResponse.json({ error: 'Erro interno' }, { status: 500 })
```

### 5. Autenticação — padrão em todas as routes protegidas

```ts
// app/api/alguma-coisa/route.ts
import { verifyAuth } from '@/modules/auth/auth.guards'
import { ok, unauthorized } from '@/lib/api-response'

export async function GET(req: Request) {
  const session = await verifyAuth(req, ['tenant_admin', 'super_admin'])
  if (!session) return unauthorized()
  // ...
}
```

### 6. Isolamento de tenant — obrigatório em toda query Prisma

Toda query que acessa dados de tenant DEVE incluir `tenantId`:

```ts
// CORRETO
const rodadas = await prisma.rodada.findMany({
  where: { tenantId: session.tenantId }
})

// ERRADO — nunca buscar sem filtro de tenant
const rodadas = await prisma.rodada.findMany()
```

Super admin (tenantId: null) usa queries sem filtro ou com filtro explícito de tenantId.

### 7. Modais

Modais ficam em `components/ui/modal/` e são controlados por estado local ou contexto.
Nunca abrir modal via navegação de rota. Usar portal React para renderizar fora da
árvore principal.

### 8. Organização de imports

Ordem preferida (usar path aliases `@/`):

```ts
// 1. React / Next
import { useState } from 'react'
import { NextResponse } from 'next/server'

// 2. Libs externas
import { format } from 'date-fns'

// 3. Módulos internos — lib, modules, utils
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/modules/auth/auth.guards'

// 4. Componentes
import { Button } from '@/components/ui/button'

// 5. Types
import type { JWTPayload } from '@/modules/auth/auth.types'
```

### 9. Tratamento de erros

- **Server:** sempre try/catch em services, logar o erro, retornar `serverError()`.
- **Client:** React Query gerencia loading/error state. Não usar try/catch em componentes para chamadas fetch.
- **Nunca** expor stack traces ou mensagens de erro do Prisma para o cliente.

### 10. Variáveis de ambiente

Documentar todas em `.env.example`. Nunca hardcodar valores sensíveis.
Variáveis de servidor ficam sem prefixo. Variáveis expostas ao cliente usam `NEXT_PUBLIC_`.

---

## Padrão de Auditoria — Obrigatório em todo o banco

Todo model que representa uma ação de usuário **deve** ter rastreabilidade completa.
Isso permite saber quem fez cada alteração, quando e em qual tenant.

### Campos obrigatórios por tipo de model

| Situação | Campos obrigatórios |
|---|---|
| Qualquer criação por usuário autenticado | `criadoPorId String` + relação `criadoPor Usuario` + `criadoEm DateTime` |
| Model mutável (status, dados editáveis) | + `atualizadoEm DateTime @updatedAt` + `atualizadoPorId String?` |
| Deleção lógica | + `deletadoEm DateTime?` |
| Operação pública (sem auth) | `criadoPorId String?` (nullable) |

### O que foi aplicado no schema

- `Rodada` — `criadoPorId` → quem iniciou a inspeção
- `RondaOcorrencia` — `criadoPorId` → quem iniciou a ronda
- `AgendamentoManutencao` — `criadoPorId` + `atualizadoPorId` → quem criou e quem mudou o status por último
- `RespostaFormulario` — `criadoPorId?` (nullable, pois submit é público)
- `Usuario` — `atualizadoEm @updatedAt`
- `Tenant` — `logoUrl`, `atualizadoEm @updatedAt`
- Todos os models de inspeção têm timestamp implícito via `concluidoEm`

### Regra de código: como popular criadoPorId

```ts
// modules/rodadas/rodada.service.ts
export async function criarRodada(tenantId: string, usuarioId: string) {
  return prisma.rodada.create({
    data: {
      tenantId,
      criadoPorId: usuarioId,  // sempre vem do JWT, nunca do body da request
    }
  })
}
```

```ts
// app/api/rodadas/route.ts
export async function POST(req: Request) {
  const session = await verifyAuth(req, ['tenant_admin', 'super_admin'])
  if (!session) return unauthorized()

  const data = await req.json()
  const rodada = await rodadaService.criarRodada(session.tenantId!, session.sub)
  return created(rodada)
}
```

**Nunca aceitar `criadoPorId` do body da request. Sempre extrair do JWT.**

---

## Organização do Banco de Dados

### Convenções de nomenclatura SQL

| Elemento | Convenção | Exemplo |
|---|---|---|
| Tabela | snake_case, plural | `rodadas`, `usuarios`, `respostas_formulario` |
| Coluna | snake_case | `criado_por_id`, `tenant_id` |
| Index | `idx_tabela_coluna` | `idx_respostas_tenant_id` |
| Foreign key | `fk_tabela_coluna` | `fk_rodadas_tenant_id` |
| Primary key | sempre `id` UUID | `id uuid default gen_random_uuid()` |

### Índices obrigatórios

Todo model com `tenantId` deve ter índice composto nas queries mais frequentes:

```prisma
@@index([tenantId])                    // mínimo
@@index([tenantId, criadoEm])          // para queries com filtro de período
@@index([tenantId, deletadoEm])        // para soft delete
@@index([tenantId, status])            // para filtros de status
```

### Regra de isolamento de tenant

- Toda query Prisma de dados operacionais **obrigatoriamente** filtra por `tenantId`
- Super admin: passa `tenantId` explícito na query ou recebe todas sem filtro
- Nunca fazer `.findMany()` sem where em tabelas com tenantId

### Migrations

- Uma migration por feature — nunca acumular mudanças de domínios diferentes
- Nome descritivo: `add_feedback_models`, `add_audit_fields_agendamentos`
- Nunca usar `prisma db push` em produção — sempre `prisma migrate deploy`
- Manter `migrations/` no git, nunca deletar migrations antigas

---

## Organização do Deploy

### Estrutura de diretórios no servidor

```
/opt/plataforma/
├── linensistem/          ← clone do repositório
│   ├── .env.production   ← variáveis de produção (fora do git)
│   └── ...
├── feedbackforms/        ← clone do repositório
│   ├── dist/             ← build da SPA servido pelo Nginx
│   └── ...
└── backups/
    └── postgres/         ← dumps automáticos via cron
```

### Variáveis de ambiente obrigatórias (.env.production)

```env
# Banco
DATABASE_URL="postgresql://plataforma_user:senha@localhost:5432/plataforma"

# JWT — MESMO valor nos dois projetos
JWT_SECRET="gerar-com-openssl-rand-base64-64"
JWT_EXPIRES_IN="8h"

# App
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://linen.seudominio.com"

# CORS — origens autorizadas
CORS_ORIGINS="https://feedback.seudominio.com,https://linen.seudominio.com"
```

### PM2 — ecosystem.config.js

```js
module.exports = {
  apps: [{
    name: 'linensistem',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/opt/plataforma/linensistem',
    instances: 1,
    autorestart: true,
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    }
  }]
}
```

### Nginx — configuração por subdomínio

```nginx
# linen.seudominio.com → Next.js
server {
    listen 443 ssl;
    server_name linen.seudominio.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# feedback.seudominio.com → SPA estática
server {
    listen 443 ssl;
    server_name feedback.seudominio.com;
    root /opt/plataforma/feedbackforms/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;  # SPA fallback
    }
}
```

### Checklist de deploy

- [ ] `npm run build` passa sem erros
- [ ] `npx prisma migrate deploy` rodado no banco de produção
- [ ] `.env.production` com JWT_SECRET idêntico nos dois projetos
- [ ] PM2 rodando e configurado para reiniciar no boot (`pm2 startup`)
- [ ] Nginx com SSL (Certbot)
- [ ] Backup automático do PostgreSQL via cron diário
- [ ] Health check: `GET /api/auth/me` retorna 401 (app respondendo)

---

## Tasks de Integração — LinenSistem

### FASE 1 — Schema Prisma unificado

- [ ] **TASK 1.1** — Adicionar campos ao model `Tenant`
  - `logoUrl   String?`
  - `atualizadoEm DateTime @updatedAt`

- [ ] **TASK 1.2** — Criar model `TemplateFormulario` no schema.prisma
  - Campos: id, tenantId, nome, campos (Json), ativo, criadoEm
  - Relação com Tenant

- [ ] **TASK 1.3** — Criar model `RespostaFormulario` no schema.prisma
  - Campos: id, tenantId, templateId?, nomePaciente, cpf, idade, genero,
    dataInternacao, dataAlta, setor, respostas (Json), comentarios, deletadoEm, criadoEm
  - Relações com Tenant e TemplateFormulario

- [ ] **TASK 1.4** — Rodar migration
  ```bash
  npx prisma migrate dev --name "add_feedback_models"
  ```

- [ ] **TASK 1.5** — Atualizar `@prisma/client` e verificar tabelas existentes intactas

### FASE 2 — Refatoração de arquitetura (boas práticas)

- [ ] **TASK 2.1** — Criar `lib/api-response.ts` com helpers padronizados

- [ ] **TASK 2.2** — Criar `modules/auth/auth.types.ts` com tipo `JWTPayload`

- [ ] **TASK 2.3** — Criar `modules/auth/auth.guards.ts` com função `verifyAuth()`
  - Centraliza verificação JWT que hoje está repetida em várias routes

- [ ] **TASK 2.4** — Reorganizar `components/` em subpastas `ui/`, `layout/`, `shared/`
  - Mover arquivos existentes (button, card, input, header, etc.)
  - Atualizar imports

- [ ] **TASK 2.5** — Criar pasta `modules/` e extrair lógica de negócio das routes
  - Começar pelos módulos mais usados: `auth`, `tenants`, `rodadas`

- [ ] **TASK 2.6** — Criar pasta `hooks/` com hooks client-side reutilizáveis

### FASE 3 — API routes do FeedbackForms

- [ ] **TASK 3.1** — Criar `app/api/feedback/form-templates/route.ts`
  - GET (lista por tenant), POST (cria template)

- [ ] **TASK 3.2** — Criar `app/api/feedback/form-templates/[id]/route.ts`
  - GET, PUT, DELETE

- [ ] **TASK 3.3** — Criar `app/api/feedback/form-responses/route.ts`
  - POST (público, sem auth — submit da pesquisa)
  - GET (autenticado — lista por tenant com filtros)

- [ ] **TASK 3.4** — Criar `app/api/feedback/form-responses/[id]/route.ts`
  - GET, DELETE (soft delete — setar deletadoEm)

- [ ] **TASK 3.5** — Criar `app/api/feedback/analytics/summary/route.ts`
  - Agrega KPIs: total respostas, média NPS, média por categoria

- [ ] **TASK 3.6** — Criar `app/api/feedback/analytics/by-period/route.ts`

- [ ] **TASK 3.7** — Criar `app/api/feedback/analytics/by-department/route.ts`

- [ ] **TASK 3.8** — Criar `modules/feedback/` com services e types

### FASE 4 — Auth unificado

- [ ] **TASK 4.1** — Garantir que JWT payload inclui: `sub, email, nome, role, tenantId, tenantSlug`

- [ ] **TASK 4.2** — Adicionar suporte a roles do FeedbackForms no guard:
  - `"holding_admin"` aceito como equivalente a `"super_admin"`

- [ ] **TASK 4.3** — Configurar CORS para aceitar origem da SPA FeedbackForms
  - Atualizar `next.config.ts` com headers CORS

- [ ] **TASK 4.4** — Sincronizar `JWT_SECRET` com o outro projeto

### FASE 5 — Deploy

- [ ] **TASK 5.1** — Criar `ecosystem.config.js` para PM2

- [ ] **TASK 5.2** — Documentar variáveis de ambiente em `.env.example` atualizado

- [ ] **TASK 5.3** — Validar build de produção: `npm run build`

---

## JWT Payload — Contrato compartilhado entre os dois projetos

```ts
interface JWTPayload {
  sub: string        // userId
  email: string
  nome: string
  role: 'super_admin' | 'tenant_admin' | 'viewer'
  tenantId: string | null   // null = super_admin
  tenantSlug: string | null
  iat?: number
  exp?: number
}
```

**JWT_SECRET:** definido em `.env` — deve ser idêntico no LinenSistem e na SPA FeedbackForms (via VITE_API_URL apontando para o mesmo backend).

---

## Ordem de execução

1. FASE 1 — Schema (base de tudo)
2. FASE 2 — Refatoração de arquitetura (fazer junto com FASE 3 para não dobrar trabalho)
3. FASE 3 — API routes feedback
4. FASE 4 — Auth unificado
5. FASE 5 — Deploy

---

*Ver também: `c:\Users\rafae\projects\feedbackforms\INTEGRATION_PLAN.md` para as tasks do lado SPA.*
