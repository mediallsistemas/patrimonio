# Testes E2E (Playwright)

Os testes E2E rodam contra o dev server (`npm run dev` — o Playwright sobe
sozinho via `webServer`) e o banco configurado em `DATABASE_URL`.

## Credenciais

Os specs precisam de usuários reais do tenant de teste. Configure via variáveis
de ambiente (ou um arquivo `.env.e2e` carregado no shell antes de rodar):

| Variável | Descrição |
|----------|-----------|
| `E2E_TENANT_SLUG` | Slug do tenant usado nos testes (ex.: `uei`) |
| `E2E_OPERATOR_USER` / `E2E_OPERATOR_PASS` | Login de um usuário `operator` do tenant |
| `E2E_ADMIN_USER` / `E2E_ADMIN_PASS` | Login de um `tenant_admin` do tenant |
| `E2E_BASE_URL` | Opcional — default `http://localhost:3000` |

**Sem essas variáveis os testes são pulados** (aparecem como `skipped`), para
que `npm run test:e2e` nunca quebre por falta de configuração.

> Atenção: os testes criam chamados reais no banco apontado por `DATABASE_URL`.
> Use um tenant de teste — nunca rode contra dados de produção.

## Rodando

```bash
npm run test:e2e        # headless
npm run test:e2e:ui     # modo UI do Playwright
```
