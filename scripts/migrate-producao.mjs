#!/usr/bin/env node
/**
 * Aplica as migrations pendentes — SOMENTE em deploy de produção.
 *
 * Roda antes do `next build` (ver package.json). O recorte por ambiente é o
 * ponto todo deste arquivo: build de preview na Vercel usa a MESMA DATABASE_URL
 * da produção, então um `prisma migrate deploy` solto no build aplicaria em
 * produção as migrations de qualquer branch aberta, antes de qualquer revisão.
 *
 * Fora da Vercel (build local, CI) não faz nada: nunca migrar um banco a partir
 * da máquina de alguém sem que a pessoa tenha pedido.
 */
import { execSync } from 'node:child_process'

const ambiente = process.env.VERCEL_ENV ?? null

if (ambiente !== 'production') {
  const onde = ambiente ? `VERCEL_ENV=${ambiente}` : 'fora da Vercel'
  console.log(`[migrate] ${onde} — migrations não aplicadas.`)
  process.exit(0)
}

if (!process.env.DATABASE_URL) {
  console.error('[migrate] DATABASE_URL ausente no deploy de produção.')
  process.exit(1)
}

console.log('[migrate] deploy de produção — aplicando migrations pendentes...')
try {
  execSync('npx prisma migrate deploy', { stdio: 'inherit' })
} catch {
  // Falha aqui derruba o build de propósito: subir código que espera uma coluna
  // inexistente quebra em runtime, o que é pior do que não subir.
  console.error('[migrate] falhou — build interrompido.')
  process.exit(1)
}
