import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

import pg from 'pg'
import { SignJWT } from 'jose'

// Fixture de E2E: tenant/usuários/ambiente rotulados, criados no banco de
// DEV apontado por DATABASE_URL e removidos no teardown. O banco de
// autenticação (AUTH_DATABASE_URL) NUNCA é tocado — a sessão é injetada
// via cookie ls_session assinado com o JWT_SECRET local.

export const FIXTURE_SLUG = 'e2e-chamados'
export const FIXTURE_AMBIENTE = 'Ambiente E2E'
export const FIXTURE_BLOCO = 'Bloco E2E'

const ROOT = path.resolve(__dirname, '..')

export function lerEnv(): Record<string, string> {
  const raw = readFileSync(path.join(ROOT, '.env'), 'utf8')
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]
      }),
  )
}

export function conectarDb(env: Record<string, string>): pg.Client {
  return new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
}

export interface FixtureIds {
  tenant: string
  admin: string
  operador: string
  bloco: string
  ambiente: string
}

// Remove qualquer resto de execuções anteriores (busca pelo slug rotulado)
export async function removerFixture(db: pg.Client): Promise<void> {
  const { rows } = await db.query('SELECT id FROM tenants WHERE slug = $1', [FIXTURE_SLUG])
  for (const { id } of rows) {
    await db.query('DELETE FROM chamados WHERE "tenantId" = $1', [id])
    await db.query('DELETE FROM ambientes_tenant WHERE "tenantId" = $1', [id])
    await db.query('DELETE FROM blocos_tenant WHERE "tenantId" = $1', [id])
    await db.query('DELETE FROM usuarios WHERE "tenantId" = $1', [id])
    await db.query('DELETE FROM tenants WHERE id = $1', [id])
  }
}

export async function criarFixture(db: pg.Client): Promise<FixtureIds> {
  const ids: FixtureIds = {
    tenant: randomUUID(),
    admin: randomUUID(),
    operador: randomUUID(),
    bloco: randomUUID(),
    ambiente: randomUUID(),
  }

  await db.query(
    `INSERT INTO tenants (id, slug, nome, ativo, "criadoEm", "atualizadoEm")
     VALUES ($1, $2, 'Tenant E2E Chamados', true, NOW(), NOW())`,
    [ids.tenant, FIXTURE_SLUG],
  )
  await db.query(
    `INSERT INTO usuarios (id, "tenantId", email, "senhaHash", nome, role, ativo, "criadoEm", "atualizadoEm")
     VALUES ($1, $2, $3, 'x', 'Admin E2E', 'tenant_admin', true, NOW(), NOW()),
            ($4, $2, $5, 'x', 'Operador E2E', 'operator', true, NOW(), NOW())`,
    [ids.admin, ids.tenant, `admin@${FIXTURE_SLUG}.local`, ids.operador, `operador@${FIXTURE_SLUG}.local`],
  )
  await db.query(
    `INSERT INTO blocos_tenant (id, "tenantId", nome, ordem, ativo) VALUES ($1, $2, $3, 0, true)`,
    [ids.bloco, ids.tenant, FIXTURE_BLOCO],
  )
  await db.query(
    `INSERT INTO ambientes_tenant (id, "tenantId", "blocoId", nome, ordem, ativo, tipo)
     VALUES ($1, $2, $3, $4, 0, true, 'ocorrencia')`,
    [ids.ambiente, ids.tenant, ids.bloco, FIXTURE_AMBIENTE],
  )

  return ids
}

export async function gerarToken(
  env: Record<string, string>,
  u: { id: string; email: string; nome: string; role: string; tenantId: string },
): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET)
  return await new SignJWT({
    sub: u.id,
    email: u.email,
    nome: u.nome,
    role: u.role,
    tenantId: u.tenantId,
    tenantSlug: FIXTURE_SLUG,
    sistemas: ['linensistem'],
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('4h')
    .sign(secret)
}

// storageState do Playwright com o cookie de sessão já definido
export function storageStateComCookie(token: string): {
  cookies: {
    name: string
    value: string
    domain: string
    path: string
    expires: number
    httpOnly: boolean
    secure: boolean
    sameSite: 'Lax'
  }[]
  origins: never[]
} {
  return {
    cookies: [
      {
        name: 'ls_session',
        value: token,
        domain: 'localhost',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 4 * 3600,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ],
    origins: [],
  }
}
