import { defineConfig, devices } from '@playwright/test'

// E2E roda contra o dev server local. Requer DATABASE_URL apontando para o
// banco de desenvolvimento e usuários seed (ver e2e/README.md).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // fluxos compartilham estado de chamados — sequencial
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
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
