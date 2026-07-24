import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // E2E fica com o Playwright — nunca com o Vitest
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
