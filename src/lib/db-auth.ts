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

// Singleton: reutiliza o pool existente no hot reload para não perder conexões ativas
if (!global.__authPool) {
  global.__authPool = createAuthPool()
}

export const authPool: Pool = global.__authPool
