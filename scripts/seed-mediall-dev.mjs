/**
 * Popula mediall_dev com dados reais de Multi_UnidadesDB.
 * Uso exclusivo para ambiente de desenvolvimento local.
 *
 * COMO USAR:
 *   node scripts/seed-mediall-dev.mjs --dry-run
 *   node scripts/seed-mediall-dev.mjs
 */

import { PrismaClient } from '../node_modules/.prisma/client/index.js'

const DRY_RUN = process.argv.includes('--dry-run')

const SOURCE_URL = 'postgresql://postgres:MediallMkt2026@dbpgpesquisamkt.ce6ipyxrb0gc.sa-east-1.rds.amazonaws.com:5432/Multi_UnidadesDB'
const TARGET_URL = 'postgresql://postgres:MediallMkt2026@dbpgpesquisamkt.ce6ipyxrb0gc.sa-east-1.rds.amazonaws.com:5432/mediall_dev'

const source = new PrismaClient({ datasources: { db: { url: SOURCE_URL } } })
const target = new PrismaClient({ datasources: { db: { url: TARGET_URL } } })

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`) }

async function copyTable(table, rows) {
  if (rows.length === 0) { log(`  ${table}: 0 registros — pulando`); return }
  if (DRY_RUN) { log(`  [DRY-RUN] ${table}: copiaria ${rows.length} registros`); return }

  await target.$executeRawUnsafe(`SET session_replication_role = 'replica'`)
  try {
    for (const row of rows) {
      const cols = Object.keys(row).map(k => `"${k}"`).join(', ')
      const vals = Object.keys(row).map((_, i) => `$${i + 1}`).join(', ')
      const conflictCols = Object.keys(row).filter(k => k !== 'id').map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')
      const values = Object.values(row).map(v => v === undefined ? null : v)
      await target.$executeRawUnsafe(
        `INSERT INTO "${table}" (${cols}) VALUES (${vals}) ON CONFLICT (id) DO UPDATE SET ${conflictCols}`,
        ...values
      )
    }
    log(`  ${table}: ${rows.length} registros copiados`)
  } finally {
    await target.$executeRawUnsafe(`SET session_replication_role = 'origin'`)
  }
}

async function main() {
  log(`Populando mediall_dev a partir de Multi_UnidadesDB ${DRY_RUN ? '[DRY-RUN]' : '[REAL]'}`)

  // Ordem respeitando FKs
  const steps = [
    ['tenants',                 `SELECT * FROM "tenants"`],
    ['usuarios',                `SELECT * FROM "usuarios"`],
    ['blocos_tenant',           `SELECT * FROM "blocos_tenant"`],
    ['ambientes_tenant',        `SELECT * FROM "ambientes_tenant"`],
    ['pessoas',                 `SELECT * FROM "pessoas"`],
    ['movimentacoes',           `SELECT * FROM "movimentacoes"`],
    ['rodadas',                 `SELECT * FROM "rodadas"`],
    ['rondas_ocorrencias',      `SELECT * FROM "rondas_ocorrencias"`],
    ['rondas_draft',            `SELECT * FROM "rondas_draft"`],
    ['registros_ambientes',     `SELECT * FROM "registros_ambientes"`],
    ['ocorrencias_detalhe',     `SELECT * FROM "ocorrencias_detalhe"`],
    ['abastecimentos',          `SELECT * FROM "abastecimentos"`],
    ['agendamentos_manutencao', `SELECT * FROM "agendamentos_manutencao"`],
    ['links_publicos_bens',     `SELECT * FROM "links_publicos_bens"`],
  ]

  try {
    for (const [i, [table, sql]] of steps.entries()) {
      log(`${i + 1}/${steps.length} ${table}...`)
      const rows = await source.$queryRawUnsafe(sql)
      await copyTable(table, rows)
    }

    if (!DRY_RUN) {
      log('Validando...')
      for (const [table] of steps) {
        const c1 = (await source.$queryRawUnsafe(`SELECT count(*)::int as c FROM "${table}"`))[0].c
        const c2 = (await target.$queryRawUnsafe(`SELECT count(*)::int as c FROM "${table}"`))[0].c
        const ok = Number(c2) >= Number(c1)
        console.log(`  ${table.padEnd(26)} origem=${c1} dev=${c2} ${ok ? '✓' : '✗ DIVERGÊNCIA'}`)
      }
    }

    log('Concluído.')
  } finally {
    await source.$disconnect()
    await target.$disconnect()
  }
}

main().catch(e => { console.error('[FATAL]', e); process.exit(1) })
