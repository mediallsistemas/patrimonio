# Módulo `usuarios`

> CRUD de usuários no banco de autenticação compartilhado (SQL cru via `authPool`), com hash bcrypt, reset de senha e suporte a admin multi-unidade.

Modelo de permissões e alcance por papel: **`docs/PERMISSOES.md`**.

## Responsabilidade

Gerencia usuários do sistema no banco de auth (`AUTH_DATABASE_URL`) usando o pool `pg` cru — **não usa Prisma**, pois a tabela `usuarios` autoritativa vive no banco compartilhado com o FeedbackForms. Todas as queries filtram `'linensistem' = ANY(u.sistemas)`, ou seja, este módulo só enxerga usuários habilitados no LinenSistem. Persiste `tenantsExtras` para o papel `admin_multi` (unidades além da primária, que viram `tenantIds` no JWT ao logar) e fornece `adminMultiOwnsUser` para escopar as ações dos papéis admin não-super.

## Arquivos

| Arquivo | Papel |
|---------|-------|
| `usuarios.service.ts` | Queries SQL no `authPool` (list/get/create/update/delete/reset) + `adminMultiOwnsUser` |
| `usuarios.types.ts` | `CreateUsuarioSchema`, `UpdateUsuarioSchema` (Zod) e tipos inferidos |

## Funções públicas

Todas retornam `UsuarioRow`: `{ id, email, nome, role, ativo, criadoEm, tenantId, tenant: { id, slug, nome } | null }` — **nunca `senhaHash`**.

| Função | Assinatura | Descrição |
|--------|-----------|-----------|
| `listarUsuarios` | `() => Promise<UsuarioRow[]>` | Todos os usuários linensistem, com JOIN em `tenants`, ordem `criadoEm ASC` |
| `listarUsuariosPorTenant` | `(tenantId: string) => Promise<UsuarioRow[]>` | Filtro por um tenant |
| `listarUsuariosPorTenants` | `(tenantIds: string[]) => Promise<UsuarioRow[]>` | Filtro `IN` — usado por tenant_admin/admin_multi via `allowedTenantIds` |
| `buscarUsuario` | `(id: string) => Promise<UsuarioRow \| null>` | Busca por id |
| `criarUsuario` | `(input: CreateUsuarioInput) => Promise<UsuarioRow>` | Gera `email = username@sistema.local`, hash bcrypt, `sistemas = ['linensistem']`; grava `tenantsExtras` só para `admin_multi`/`viewer`. **INSERT puro** — duplicata estoura unique violation e vira 409 na rota |
| `atualizarUsuario` | `(id: string, input: UpdateUsuarioInput) => Promise<UsuarioRow \| null>` | UPDATE dinâmico de `nome`/`ativo`/`role`/`tenantsExtras` + `atualizadoEm = NOW()` |
| `adminMultiOwnsUser` | `(adminTenantIds: string[], userTenantId: string \| null) => boolean` | `false` para alvo sem tenant (super_admin); senão checa pertencimento às unidades administradas |
| `viewerOwnsUser` | `@deprecated` — alias de `adminMultiOwnsUser` | Nome legado mantido por compatibilidade |
| `deletarUsuario` | `(id: string) => Promise<void>` | **Hard delete** |
| `resetSenhaUsuario` | `(id: string) => Promise<{ novaSenha: string }>` | Gera senha numérica de 8 dígitos, grava hash + `mustChangePassword = true`, **retorna a senha em texto claro** para exibição única no admin |

## Modelos de banco

| Modelo | Tabela (@@map) | Campos-chave | Índices |
|--------|----------------|--------------|---------|
| `Usuario` (espelho Prisma) | `usuarios` | `id (uuid)`, `email @unique`, `username? @unique`, `senhaHash`, `nome`, `role (String, default "tenant_admin")`, `tenantId?`, `sistemas String[]`, `tenantsExtras String[]`, `ativo`, `mustChangePassword`, `criadoEm`, `atualizadoEm` | apenas os `@unique` — **sem `@@index([tenantId])`** |

Atenção: o service opera na tabela `usuarios` do **banco de auth** (`authPool`); o modelo Prisma `Usuario` é o espelho no banco linensistem, sincronizado por upsert no login para satisfazer FKs (`criadoPorId` de rondas, chamados etc.).

## Rotas de API que usam este módulo

Todas usam a allowlist `['super_admin', 'tenant_admin', 'admin_multi', 'viewer']` (paridade: mesma rota, alcance diferente). Escopo dos não-super via `allowedTenantIds(session)` + `podeAgirSobre`/`adminMultiOwnsUser`.

| Método + caminho | Roles permitidos | O que faz |
|------------------|------------------|-----------|
| `GET /api/admin/usuarios` | 4 papéis admin | super_admin → todos; demais → `listarUsuariosPorTenants(allowedTenantIds)` |
| `POST /api/admin/usuarios` | 4 papéis admin | tenant_admin: `tenantId` forçado da sessão; admin_multi/viewer: só em unidade que administra; não-super não cria `super_admin` nem `admin_multi` |
| `GET /api/admin/usuarios/[id]` | 4 papéis admin | Busca; não-super só vê alvo em suas unidades e nunca conta `super_admin` (`podeAgirSobre`) |
| `PATCH /api/admin/usuarios/[id]` | 4 papéis admin | Atualiza `nome/ativo/role/tenantsExtras`; não-super não promove a `super_admin`/`admin_multi` nem mexe em conta super_admin |
| `DELETE /api/admin/usuarios/[id]` | 4 papéis admin | Hard delete escopado por `podeAgirSobre` |
| `POST /api/admin/usuarios/[id]/reset-password` | 4 papéis admin | Reseta senha e retorna `{ novaSenha }`; não-super nunca reseta um `super_admin` |
| `GET /api/tenant/usuarios` | `tenant_admin` | Lista usuários do próprio tenant |
| `POST /api/tenant/usuarios` | `tenant_admin` | Cria usuário com `tenantId` forçado da sessão; bloqueia `super_admin` |

## Consumo no client

- `src/services/admin-usuarios.service.ts` — `listarUsuarios()`, `criarUsuario()` (input aceita `tenantsExtras`), `resetSenhaUsuario()`.
- `src/hooks/useAdminUsuarios.ts` — `useUsuarios`, `useTenants(enabled)`, `useCreateUsuario`; alimenta `ModalCriarUsuario` e `ModalConfirmarReset`.
- As rotas `tenant/usuarios` não têm service/hook dedicado em `src/services`/`src/hooks` deste repo.

## Padrões aplicados

- **Guard + escopo por role na rota**:
  ```ts
  const session = await verifyAuth(req, [...ROLES])
  if (!session) return forbidden()
  if (session.role === 'tenant_admin') data = { ...body, tenantId: session.tenantId } // nunca do body
  else if (session.role !== 'super_admin' && !allowedTenantIds(session).includes(body.tenantId)) return forbidden()
  ```
- **Zod na borda**: `CreateUsuarioSchema.safeParse(...)` → `badRequest(fieldErrors)`; schemas em `usuarios.types.ts` (`tenantsExtras` limitado a 50 itens).
- **Hash de senha**: `hashPassword` (bcryptjs, cost 10, de `lib/auth.ts`) em `criarUsuario` e `resetSenhaUsuario`.
- **SQL parametrizado**: sempre placeholders `$1..$n`; o `IN` de `listarUsuariosPorTenants` monta apenas os placeholders dinamicamente.
- **Helpers de resposta** de `lib/api-response.ts`; erros convertidos em `conflict`/`notFound` por substring (`Unique constraint` / `duplicate key` do pg → 409).
- **Erro**: `try/catch` com log `[usuarios.service] fn:` e rethrow.

## Observações e cuidados

- **`senhaHash` nunca sai do service** — nenhum SELECT de retorno o inclui. Só o login e `me/password` o leem, internamente.
- **`resetSenhaUsuario` retorna a senha em texto claro** na resposta HTTP (por design, para o admin repassar). Senha de 8 dígitos gerada com `Math.random()` — não criptograficamente forte; `mustChangePassword: true` mitiga.
- **`viewer` = alias legado de `admin_multi`** (rename feito no repo linensistem; banco de auth compartilhado ainda tem usuários `viewer`). Diverge do CLAUDE.md, que documenta viewer como read-only. SQL de migração em PERMISSOES.md §5.
- **Zod de role incompleto**: `z.enum(['super_admin','tenant_admin','admin_multi','operator','viewer'])` — não permite criar `operator_patrimonio` nem `operator_forms`, embora existam no `JWTPayload`.
- **`criarUsuario` deixou de ser upsert**: o `ON CONFLICT (email) DO UPDATE` antigo transformava colisão em update silencioso (mantinha senha/role/tenant do registro velho e devolvia 201) — removido de propósito; agora duplicata vira 409.
- **`tenantsExtras` só entra em vigor no próximo login** do usuário (o JWT de 4h carrega o `tenantIds` calculado no login; `me/password` também o reconstrói ao reemitir o cookie).
- **Dois bancos**: escrita aqui afeta o banco de auth compartilhado com o FeedbackForms; o espelho no banco linensistem só é atualizado no próximo login do usuário (upsert em `api/auth/login`).
- **Hard delete** sem soft delete; apagar usuário com registros ligados no banco linensistem pode quebrar FKs do espelho.
