import path from 'node:path'

import { test, expect } from '@playwright/test'

import { FIXTURE_SLUG, FIXTURE_AMBIENTE } from './fixture'

// Fluxo completo de chamados dirigindo a UI real: criar → assumir →
// finalizar (operador); campos fiscais e dashboard (admin). A sessão vem
// dos storage states gravados no global-setup (cookie ls_session) — sem
// tela de login e sem credenciais reais.

const AUTH = (nome: string) => path.join(__dirname, '.auth', nome)

// Título único por execução para não colidir com dados de runs anteriores
const TITULO = `Chamado E2E ${Date.now()}`

test.describe.configure({ mode: 'serial' })

test.describe('operador', () => {
  test.use({ storageState: AUTH('operator.json') })

  test('cria um chamado selecionando o ambiente', async ({ page }) => {
    await page.goto(`/${FIXTURE_SLUG}/chamados/novo`)

    // Etapa 1 — seleção de ambiente (UI reusada da ronda)
    await page.getByRole('button', { name: FIXTURE_AMBIENTE }).click()

    // Etapa 2 — dados do chamado
    await page.getByPlaceholder(/descarga do banheiro/i).fill(TITULO)
    await page.getByPlaceholder(/descreva o problema/i).fill('Aberto pelo teste E2E de navegador')
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    await page.locator('input[type="date"]').fill(amanha)
    await page.getByRole('button', { name: /abrir chamado/i }).click()

    // Etapa 3 — confirmação com o número
    await expect(page.getByText(/chamado #\d+ aberto/i)).toBeVisible({ timeout: 20_000 })
  })

  test('assume com prioridade e finaliza pelo painel', async ({ page }) => {
    await page.goto(`/${FIXTURE_SLUG}/chamados`)

    // Expande o card e assume
    await page.getByRole('button', { name: new RegExp(TITULO) }).click()
    await page.getByRole('button', { name: 'Assumir', exact: true }).click()
    await expect(page.getByText(/você é o responsável/i)).toBeVisible({ timeout: 15_000 })

    // Finaliza — modal no formato de ocorrência
    await page.getByRole('button', { name: 'Finalizar', exact: true }).click()
    await page.getByPlaceholder(/serviço executado/i).fill('Resolvido no teste E2E')
    await page.getByRole('button', { name: /finalizar chamado/i }).click()
    await expect(page.getByText(/chamado finalizado/i)).toBeVisible({ timeout: 15_000 })
  })

  test('NÃO vê os campos fiscais', async ({ page }) => {
    await page.goto(`/${FIXTURE_SLUG}/chamados`)

    await page.getByRole('button', { name: new RegExp(TITULO) }).click()
    // Detalhe expandido (descrição visível) sem o bloco fiscal
    await expect(page.getByText('Aberto pelo teste E2E de navegador')).toBeVisible()
    await expect(page.getByText(/dados fiscais/i)).toHaveCount(0)
    await expect(page.getByPlaceholder(/nome do fornecedor/i)).toHaveCount(0)
  })
})

test.describe('admin', () => {
  test.use({ storageState: AUTH('admin.json') })

  test('edita os campos fiscais do chamado', async ({ page }) => {
    await page.goto(`/${FIXTURE_SLUG}/chamados`)

    await page.getByRole('button', { name: new RegExp(TITULO) }).click()
    await expect(page.getByText(/dados fiscais/i)).toBeVisible()
    await page.getByPlaceholder(/nome do fornecedor/i).fill('Fornecedor E2E')
    await page.getByPlaceholder('0,00').fill('123,45')
    await page.getByRole('button', { name: /salvar fiscais/i }).click()
    await expect(page.getByText(/dados fiscais salvos/i)).toBeVisible({ timeout: 15_000 })
  })

  test('vê o dashboard com os indicadores e a lista de chamados', async ({ page }) => {
    await page.goto('/admin/chamados')

    await expect(page.getByText('Total de chamados')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Valor gasto')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Chamados por status')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Chamados por responsável')).toBeVisible({ timeout: 15_000 })
    // O chamado finalizado do fluxo aparece na distribuição por responsável
    // (getByTitle, não getByText — o card da lista abaixo também mostra o
    // nome do responsável, então um texto solto casaria com os dois lugares)
    await expect(page.getByTitle('Operador E2E')).toBeVisible({ timeout: 15_000 })

    // A lista de chamados de verdade (não só os indicadores agregados) — busca
    // e o dropdown de usuários (admin) fazem chamadas próprias, compiladas
    // sob demanda no dev server — timeout maior para a primeira renderização
    await expect(page.getByRole('button', { name: new RegExp(TITULO) })).toBeVisible({ timeout: 20_000 })
  })
})
