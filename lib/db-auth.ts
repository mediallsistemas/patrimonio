import { Pool } from 'pg'
import { prisma } from './db'

declare global {
  // eslint-disable-next-line no-var
  var __authPool: Pool | undefined
}

// prismaAuth: alias do prisma client principal — usado por módulos de auth/tenants
export { prisma as prismaAuth }

function createAuthPool(): Pool {
  const url = process.env.AUTH_DATABASE_URL
  if (!url) throw new Error('AUTH_DATABASE_URL não definida')

  // Parse manual para separar host/user/password/db e forçar SSL sem validar certificado
  const parsed = new URL(url)
  return new Pool({
    host:     parsed.hostname,
    port:     parseInt(parsed.port || '5432'),
    user:     decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
    ssl:      { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })
}

if (global.__authPool) {
  global.__authPool.end().catch(() => {})
  global.__authPool = undefined
}

export const authPool: Pool = createAuthPool()
global.__authPool = authPool
