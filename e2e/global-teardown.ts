import { lerEnv, conectarDb, removerFixture } from './fixture'

// Remove a fixture (tenant/usuários/ambiente/chamados rotulados) do banco DEV.
export default async function globalTeardown(): Promise<void> {
  const env = lerEnv()
  const db = conectarDb(env)
  await db.connect()
  try {
    await removerFixture(db)
  } finally {
    await db.end()
  }
}
