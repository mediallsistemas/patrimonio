# Testes E2E (Playwright)

Os testes E2E dirigem a **UI real** no navegador contra o dev server
(`npm run dev` — o Playwright sobe/reusa via `webServer`) e o banco DEV de
`DATABASE_URL`.

## Como funciona a autenticação

**Nenhuma credencial real é necessária.** O `global-setup`:

1. Cria uma fixture rotulada no banco DEV (`DATABASE_URL`): tenant
   `e2e-chamados` + usuários `operator`/`tenant_admin` + bloco/ambiente.
2. Assina tokens JWT com o `JWT_SECRET` do `.env` e grava os cookies
   `ls_session` em `e2e/.auth/*.json` (storage states do Playwright).

O `global-teardown` remove **tudo** que a fixture criou (inclusive os
chamados abertos pelos testes). O banco de autenticação
(`AUTH_DATABASE_URL`) **nunca é tocado**.

> Atenção: aponte `DATABASE_URL` para um banco de desenvolvimento.
> Nunca rode E2E contra produção.

## Rodando

```bash
npx playwright install chromium   # uma vez
npm run test:e2e                  # headless
npm run test:e2e:ui               # modo UI do Playwright
```

## Cobertura

| Spec | O que valida |
|------|--------------|
| operador cria chamado | Seleção de ambiente (UI da ronda) + dados + confirmação com número |
| operador assume/finaliza | Assumir com prioridade, modal de finalização no formato ocorrência |
| operador não vê fiscais | Bloco "Dados fiscais" ausente para não-admin |
| admin edita fiscais | Fornecedor + valor (R$) salvos pelo painel |
| admin dashboard | Tiles e distribuições em `/admin/chamados` |
