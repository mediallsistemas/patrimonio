import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import {
  lerEnv,
  conectarDb,
  removerFixture,
  criarFixture,
  gerarToken,
  storageStateComCookie,
  FIXTURE_SLUG,
} from './fixture'

// Cria a fixture de chamados no banco DEV e grava os storage states com o
// cookie de sessão do operador e do admin. Roda uma vez antes da suíte.
export default async function globalSetup(): Promise<void> {
  const env = lerEnv()
  const db = conectarDb(env)
  await db.connect()
  try {
    await removerFixture(db) // limpa restos de execuções anteriores
    const ids = await criarFixture(db)

    const authDir = path.join(__dirname, '.auth')
    mkdirSync(authDir, { recursive: true })

    const tokenOperador = await gerarToken(env, {
      id: ids.operador,
      email: `operador@${FIXTURE_SLUG}.local`,
      nome: 'Operador E2E',
      role: 'operator',
      tenantId: ids.tenant,
    })
    const tokenAdmin = await gerarToken(env, {
      id: ids.admin,
      email: `admin@${FIXTURE_SLUG}.local`,
      nome: 'Admin E2E',
      role: 'tenant_admin',
      tenantId: ids.tenant,
    })

    writeFileSync(
      path.join(authDir, 'operator.json'),
      JSON.stringify(storageStateComCookie(tokenOperador)),
    )
    writeFileSync(
      path.join(authDir, 'admin.json'),
      JSON.stringify(storageStateComCookie(tokenAdmin)),
    )
  } finally {
    await db.end()
  }
}
