import { defineConfig, devices } from '@playwright/test'

// E2E roda contra o dev server local e o banco DEV de DATABASE_URL.
// A fixture (tenant/usuários/ambiente) é criada no global-setup e removida
// no teardown — nenhuma credencial real é necessária (ver e2e/README.md).
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: false, // fluxos compartilham estado de chamados — sequencial
  retries: 0,
  reporter: 'list',
  // Dev server compila páginas sob demanda no primeiro hit (15s+ nesta infra)
  timeout: 90_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    navigationTimeout: 60_000,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
