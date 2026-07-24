import { test, expect, type Page } from '@playwright/test'

// Fluxo completo de chamados: criar → assumir → finalizar (operador),
// campos fiscais visíveis só para admin, dashboard admin.
// Requer credenciais via env (ver e2e/README.md) — sem elas, os testes pulam.

const TENANT = process.env.E2E_TENANT_SLUG
const OP_USER = process.env.E2E_OPERATOR_USER
const OP_PASS = process.env.E2E_OPERATOR_PASS
const ADMIN_USER = process.env.E2E_ADMIN_USER
const ADMIN_PASS = process.env.E2E_ADMIN_PASS

const configurado = Boolean(TENANT && OP_USER && OP_PASS && ADMIN_USER && ADMIN_PASS)

test.skip(!configurado, 'Credenciais E2E não configuradas — ver e2e/README.md')

// Título único por execução para não colidir com dados anteriores
const TITULO = `E2E chamado ${Date.now()}`

async function login(page: Page, usuario: string, senha: string) {
  await page.goto('/login')
  await page.getByPlaceholder('usuario.nome').fill(usuario)
  await page.getByPlaceholder('senha').fill(senha)
  await page.getByRole('button', { name: /entrar/i }).click()
  // Sai da tela de login (home do tenant ou admin)
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })
}

test.describe.serial('fluxo de chamados', () => {
  test('operador cria um chamado com ambiente', async ({ page }) => {
    await login(page, OP_USER!, OP_PASS!)
    await page.goto(`/${TENANT}/chamados/novo`)

    // Etapa 1 — seleciona o primeiro ambiente disponível
    await expect(page.getByText('Selecione o ambiente')).toBeVisible({ timeout: 15_000 })
    const primeiroAmbiente = page.locator('button:has(svg)').filter({ hasText: /.+/ }).first()
    await primeiroAmbiente.waitFor({ timeout: 15_000 })
    await primeiroAmbiente.click()

    // Etapa 2 — dados
    await page.getByPlaceholder(/descarga do banheiro/i).fill(TITULO)
    await page.getByPlaceholder(/descreva o problema/i).fill('Criado pelo teste E2E — pode remover')
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    await page.locator('input[type="date"]').fill(amanha)
    await page.getByRole('button', { name: /abrir chamado/i }).click()

    // Etapa 3 — confirmação com número
    await expect(page.getByText(/chamado #\d+ aberto/i)).toBeVisible({ timeout: 15_000 })
  })

  test('operador assume e finaliza pelo painel', async ({ page }) => {
    await login(page, OP_USER!, OP_PASS!)
    await page.goto(`/${TENANT}/chamados`)

    // Expande o card do chamado criado
    const card = page.locator('div').filter({ hasText: TITULO }).locator('button').first()
    await card.waitFor({ timeout: 15_000 })
    await card.click()

    // Assumir (com prioridade)
    await page.getByRole('button', { name: 'Assumir' }).click()
    await expect(page.getByText(/você é o responsável/i)).toBeVisible({ timeout: 10_000 })

    // Reabre o card (a lista recarrega) e finaliza
    const cardDeNovo = page.locator('div').filter({ hasText: TITULO }).locator('button').first()
    await cardDeNovo.click()
    await page.getByRole('button', { name: 'Finalizar' }).click()

    // Modal de finalização — formato de ocorrência
    await page.getByPlaceholder(/serviço executado/i).fill('Resolvido pelo teste E2E')
    await page.getByRole('button', { name: /finalizar chamado/i }).click()
    await expect(page.getByText(/chamado finalizado/i)).toBeVisible({ timeout: 10_000 })
  })

  test('operador NÃO vê campos fiscais', async ({ page }) => {
    await login(page, OP_USER!, OP_PASS!)
    await page.goto(`/${TENANT}/chamados`)

    const card = page.locator('div').filter({ hasText: TITULO }).locator('button').first()
    await card.waitFor({ timeout: 15_000 })
    await card.click()

    await expect(page.getByText(/dados fiscais/i)).toHaveCount(0)
    await expect(page.getByText(/fornecedor/i)).toHaveCount(0)
  })

  test('admin edita campos fiscais', async ({ page }) => {
    await login(page, ADMIN_USER!, ADMIN_PASS!)
    await page.goto(`/${TENANT}/chamados`)

    // Filtra por finalizados para achar o chamado do teste
    await page.locator('select').first().selectOption('finalizado')
    const card = page.locator('div').filter({ hasText: TITULO }).locator('button').first()
    await card.waitFor({ timeout: 15_000 })
    await card.click()

    await expect(page.getByText(/dados fiscais/i)).toBeVisible()
    await page.getByPlaceholder(/nome do fornecedor/i).fill('Fornecedor E2E')
    await page.getByPlaceholder('0,00').fill('123,45')
    await page.getByRole('button', { name: /salvar fiscais/i }).click()
    await expect(page.getByText(/dados fiscais salvos/i)).toBeVisible({ timeout: 10_000 })
  })

  test('admin vê o dashboard de chamados', async ({ page }) => {
    await login(page, ADMIN_USER!, ADMIN_PASS!)
    await page.goto('/admin/chamados')

    await expect(page.getByText('Total de chamados')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Valor gasto')).toBeVisible()
    await expect(page.getByText('Chamados por status')).toBeVisible()
  })
})
