# Permissões, Papéis e Escopo Multi-Tenant

> Fonte de verdade conceitual do sistema de permissões. Se você vai mexer em
> auth, papéis ou escopo de tenant, **leia este arquivo primeiro** — e mantenha-o
> atualizado no mesmo PR que mudar o comportamento.

---

## 1. O modelo em uma frase

**Todos os papéis administrativos veem as MESMAS telas e usam as MESMAS rotas;
o que muda entre eles é apenas o ALCANCE — quais unidades (tenants) cada um
enxerga.** Permissão de tela nunca deve divergir de permissão de API.

| Papel | Alcance | Origem do alcance |
|-------|---------|-------------------|
| `super_admin` | todas as unidades | `tenantId: null` no JWT |
| `admin_multi` | N unidades | `tenantIds[]` no JWT (= `tenantId` + coluna `tenantsExtras`) |
| `tenant_admin` | 1 unidade | `tenantId` no JWT |
| `operator` / `operator_patrimonio` | 1 unidade (operacional) | `tenantId` no JWT |
| `operator_forms` | FeedbackForms apenas | — |
| `viewer` | **alias LEGADO de `admin_multi`** (ver §5) | `tenantIds[]` |
| `manutencao_admin` / `manutencao_user` | órfãos (ver §7) | — |

---

## 2. Onde o escopo vive — e a regra de ouro

**Toda decisão de escopo passa por `src/modules/auth/tenant-filter.ts`.**
Nunca reconstrua a lógica inline numa rota — foi exatamente essa duplicação
que causou os bugs de "admin vê menos que admin global" e um vazamento
cross-tenant (ver §8).

| Helper | Quando usar | Retorna |
|--------|-------------|---------|
| `escopoLeitura(session)` | listas agregadas do painel admin (rondas, manutenções) | `{global:true}` \| `{global:false, tenantIds}` — distingue "vê tudo" de "sem unidade" |
| `filtroEscopo(escopo)` | converter o escopo acima em `where` Prisma | `{}` \| `{tenantId}` \| `{tenantId:{in}}` |
| `tenantFilter(session)` | `where` direto a partir da sessão (chamados etc.) | idem |
| `allowedTenantIds(session)` | precisa da LISTA de unidades (dropdowns, SQL `IN`) | `string[]` |
| `canScopeTenant(session, tenantId)` | validar acesso a UM tenant específico (rotas por slug/id) | `boolean` |
| `resolveActiveTenantId(session, req)` | rotas `/me/*` e operacionais — "unidade ativa" | `string \| null` |

⚠️ Não confundir `resolveActiveTenantId` (header `x-tenant-id`, validado) com
`resolveTenantId` de `tenant-resolver.ts` (query param `tenantSlug`, usado pelas
rotas do FeedbackForms SPA). São mecanismos diferentes para clientes diferentes.

### Dois tipos de rota, dois helpers

- **Rotas de agregação** (`/api/admin/*`, `/api/me/tenants`): usam
  `escopoLeitura`/`allowedTenantIds` → admin_multi vê a SOMA das suas unidades.
- **Rotas de unidade ativa** (`/api/me/*`, `/api/rondas`, `/api/agendamentos`,
  `/api/trilogo`): usam `resolveActiveTenantId` → admin_multi opera em UMA
  unidade por vez (a do slug da URL). Não passe `tenantIds` aqui — a lista é da
  unidade, não a soma.

---

## 3. Como o admin_multi troca de unidade (mecanismo x-tenant-id)

1. O admin_multi navega para `/{slug}/manutencao` (via `UnitSelector`, que lista
   `/api/me/tenants`). **O slug da URL é a fonte da verdade da unidade ativa.**
2. `[tenantSlug]/layout.tsx` resolve slug → tenantId e monta `<ActiveTenantSync>`,
   que grava a unidade ativa em `services/active-tenant.ts` (sessionStorage).
3. `services/api.ts` envia `x-tenant-id: <unidade ativa>` em toda chamada.
4. No servidor, `resolveActiveTenantId` **só aceita o header se
   `canScopeTenant` aprovar** — usuário comum não consegue forjar acesso.

Middleware e layouts deixam admin_multi passar por qualquer `/{slug}/…`; a
validação fina (slug ∈ tenantIds) acontece nas APIs. Defesa em profundidade:
UI esconde, layout redireciona, API nega.

---

## 4. Matriz de acesso (pós-refactor jul/2026)

| Recurso | super_admin | admin_multi | tenant_admin |
|---------|:-----------:|:-----------:|:------------:|
| Painel /admin (mesmos cards) | ✅ todas | ✅ suas N | ✅ a sua |
| Usuários: listar/criar/editar/excluir/resetar senha | ✅ | ✅ (escopado; não toca super_admin, não promove a super/multi) | ✅ (idem) |
| Unidades (criar/editar/excluir/sync) | ✅ | ❌ (só lista as suas p/ seletores) | ❌ (idem) |
| Rondas (monitoramento) | ✅ todas | ✅ suas | ✅ a sua |
| Manutenções (painel + relatório) | ✅ | ✅ | ✅ |
| Chamados (painel, tiles, atribuir, cancelar, fiscal, abrir pelo admin) | ✅ | ✅ | ✅ |
| Bens por Ambiente (Trílogo) | ✅ qualquer empresa | ✅ empresas das suas unidades | ✅ a da sua |
| Área /{slug}/manutencao + seletor de unidade | ✅ | ✅ (UnitSelector) | ✅ (sem seletor) |
| Dashboard de Rouparia | módulo **oculto** (`_modules.ts`) — feature morta pós-remoção de hotelaria |
| Triagem Trílogo (`/api/admin/chamados/triagem`) | ✅ | ❌ | ❌ (fila cross-tenant sem tela; decisão deliberada) |

---

## 5. `viewer` — nome legado (história importante)

No repo **linensistem** houve a migração `rename_viewer_to_admin_multi`: o papel
`viewer` FOI RENOMEADO para `admin_multi`. O repo patrimonio forkou **antes**
disso e seguiu usando `viewer` como "Admin Regional". Além disso, `viewer` é um
papel legítimo do **FeedbackForms** (leitura), e o banco de auth é compartilhado.

Política atual no patrimonio:
- `viewer` é aceito como **alias de admin_multi** na maior parte das rotas
  (paridade parcial imediata para os usuários existentes).
- **Exceção: admin de chamados** (`ROLES_ADMIN_CHAMADOS`) — viewer segue sem
  poderes de admin ali (travado por teste). Paridade total ⇒ renomear no banco:

```sql
-- Banco de AUTH (Autenticacao_DB → tabela usuarios), para cada admin regional:
UPDATE usuarios SET role = 'admin_multi'
WHERE role = 'viewer' AND 'linensistem' = ANY(sistemas);
```

FeedbackForms não quebra: o `ROLE_MAP` de lá trata papel desconhecido como
`viewer` (leitura) — `admin_multi` degrada com segurança.

A área `/viewer/*` (telas duplicadas de bens/patrimonio/rondas/usuarios) é
código morto navegável — nada aponta pra ela. Ficou intocada por decisão;
candidata a remoção quando os usuários migrarem de papel.

---

## 6. Criando um admin_multi

1. Painel Admin → Usuários → Novo Usuário (como super_admin) → perfil
   "Admin Multi-Unidade" → escolher unidade principal + unidades adicionais.
   (Ou direto no banco: `role='admin_multi'`, `tenantsExtras = ARRAY[...ids]`.)
2. No login, `[tenantId, ...tenantsExtras]` vira `tenantIds[]` no JWT
   (`app/api/auth/login/route.ts`). JWT expira em 4h — mudanças de escopo só
   valem no próximo login.

---

## 7. Papéis órfãos — dívida conhecida

`manutencao_admin` e `manutencao_user` aparecem no middleware e no layout de
manutenção, mas **não estão no union `JWTPayload['role']`** — nenhuma rota API
tipada consegue autorizá-los (o `verifyAuth` rejeita). Não são criáveis pela UI.
Se esses papéis existem no banco, decidir: incorporar ao union (e às allowlists)
ou migrar os usuários para `operator`/`tenant_admin` e remover as menções.

---

## 8. Por que "sempre quebra algo em outra parte" — diagnóstico

Não é falta de backend. As causas estruturais, em ordem de dano:

1. **Dois repositórios divergentes do mesmo produto** (`patrimonio` = deploy no
   ar; `linensistem` = cópia com features que nunca migraram, como o próprio
   admin_multi). Correção feita numa cópia não existe na outra. ➜ Regra: **todo
   trabalho novo acontece SÓ no patrimonio**; o linensistem é referência
   histórica, não destino de features.
2. **Lógica de permissão duplicada inline** (~7 reimplementações do fallback de
   tenantIds, allowlists divergentes por rota, 3 conjuntos de MANUTENCAO_ROLES).
   Mudou num lugar, esqueceu nos outros. ➜ Este refactor centralizou em
   `tenant-filter.ts` + `*.rules.ts`; **mantenha assim**.
3. **UI e API decidindo permissão separadamente** (página mostrava o que a API
   negava: dashboard p/ tenant_admin, dropdown de rondas vazio). ➜ Regra: a
   página consome a MESMA lista `*.rules.ts` que a rota.
4. **Papéis no banco fora do tipo TypeScript** (cast `as JWTPayload['role']` em
   auth.guards) — o compilador não enxerga o que o banco tem. ➜ Ao criar papel:
   union + LINENSISTEM_ROLES + allowlists + docs, num PR só.
5. **JWT compartilhado com o FeedbackForms** — mudanças aqui repercutem lá.
   Contrato: não renomear/remover campos do payload sem atualizar os dois.

---

## 9. Checklist para mexer em permissões

- [ ] O papel está no union de `auth.types.ts` e em `LINENSISTEM_ROLES`?
- [ ] A allowlist da rota usa constante compartilhada (`*.rules.ts` / `ADMIN_ROLES`)?
- [ ] O escopo vem de `tenant-filter.ts` (nunca inline)?
- [ ] A UI esconde exatamente o que a API nega (mesma lista)?
- [ ] Testes de rules atualizados (chamados/manutencoes)?
- [ ] Este arquivo e o CLAUDE.md refletem a mudança?
