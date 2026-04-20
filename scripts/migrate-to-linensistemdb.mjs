/**
 * MIGRAÇÃO: Multi_UnidadesDB → linensistemDB
 *
 * Copia todos os dados operacionais do LinenSistem para o banco dedicado.
 * Auth (usuarios, tenants) NÃO é migrado — continua em Multi_UnidadesDB.
 *
 * COMO USAR:
 *   node scripts/migrate-to-linensistemdb.mjs --dry-run    ← só valida, não escreve
 *   node scripts/migrate-to-linensistemdb.mjs              ← migra de verdade
 *
 * PRÉ-REQUISITOS:
 *   1. linensistemDB com schema atualizado (prisma migrate deploy)
 *   2. Backup de Multi_UnidadesDB feito
 *   3. Aplicação fora do ar ou em modo read-only durante a execução
 */

import { PrismaClient } from '../node_modules/.prisma/client/index.js'

const DRY_RUN = process.argv.includes('--dry-run')

const SOURCE_URL = 'postgresql://postgres:MediallMkt2026@dbpgpesquisamkt.ce6ipyxrb0gc.sa-east-1.rds.amazonaws.com:5432/Multi_UnidadesDB'
const TARGET_URL = 'postgresql://postgres:MediallMkt2026@dbpgpesquisamkt.ce6ipyxrb0gc.sa-east-1.rds.amazonaws.com:5432/linensistemDB'

const source = new PrismaClient({ datasources: { db: { url: SOURCE_URL } } })
const target = new PrismaClient({ datasources: { db: { url: TARGET_URL } } })

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`) }
function warn(msg) { console.warn(`[WARN] ${msg}`) }

async function count(client, table) {
  const r = await client.$queryRawUnsafe(`SELECT count(*)::int as c FROM "${table}"`)
  return Number(r[0].c)
}

async function copyTable(table, rows) {
  if (rows.length === 0) { log(`  ${table}: 0 registros — pulando`); return }
  if (DRY_RUN) { log(`  [DRY-RUN] ${table}: copiaria ${rows.length} registros`); return }

  // Desabilita FK checks temporariamente via SET session_replication_role
  // (disponível no PostgreSQL ≥ 9.5, requer superuser)
  await target.$executeRawUnsafe(`SET session_replication_role = 'replica'`)
  try {
    // Usa upsert para ser idempotente (re-executável sem duplicar)
    let inserted = 0
    for (const row of rows) {
      const cols = Object.keys(row).map(k => `"${k}"`).join(', ')
      const vals = Object.keys(row).map((_, i) => `$${i + 1}`).join(', ')
      const conflictCols = Object.keys(row).filter(k => k !== 'id').map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')
      const values = Object.values(row).map(v => v === undefined ? null : v)
      await target.$executeRawUnsafe(
        `INSERT INTO "${table}" (${cols}) VALUES (${vals}) ON CONFLICT (id) DO UPDATE SET ${conflictCols}`,
        ...values
      )
      inserted++
    }
    log(`  ${table}: ${inserted} registros copiados`)
  } finally {
    await target.$executeRawUnsafe(`SET session_replication_role = 'origin'`)
  }
}

// ──────────────────────────────────────────────────────────
// Fase 0: Validação pré-migração
// ──────────────────────────────────────────────────────────

async function validate() {
  log('=== FASE 0: Validação ===')

  // Verifica que linensistemDB tem schema completo
  const tables = [
    'tenants','usuarios','blocos_tenant','ambientes_tenant','pessoas',
    'movimentacoes','rodadas','rondas_ocorrencias','rondas_draft',
    'registros_ambientes','ocorrencias_detalhe','abastecimentos',
    'agendamentos_manutencao','links_publicos_bens'
  ]

  console.log('\nContagem atual:')
  console.log('Tabela                    | Multi_UnidadesDB | linensistemDB | Status')
  console.log('--------------------------|------------------|---------------|-------')
  let issues = 0
  for (const t of tables) {
    const c1 = await count(source, t)
    const c2 = await count(target, t)
    const status = c2 >= c1 ? 'OK' : c2 === 0 && c1 > 0 ? 'VAZIO' : 'PARCIAL'
    if (status !== 'OK') issues++
    console.log(t.padEnd(26) + '| ' + String(c1).padEnd(18) + '| ' + String(c2).padEnd(15) + '| ' + status)
  }
  console.log()
  if (issues === 0) {
    log('linensistemDB já está sincronizado. Nada a fazer.')
    return false
  }
  log(`${issues} tabela(s) precisam de migração.`)
  return true
}

// ──────────────────────────────────────────────────────────
// Fase 1: Migração de dados operacionais
// Ordem respeitando FKs: tenantId → resto
// Nota: tenants e usuarios SÃO copiados para linensistemDB também,
// pois as tabelas operacionais têm FK para eles.
// ──────────────────────────────────────────────────────────

async function migrate() {
  log('=== FASE 1: Migração de dados ===')
  if (DRY_RUN) log('*** MODO DRY-RUN — nenhuma escrita será feita ***')

  // 1. Tenants (FK root — operacionais dependem deles)
  log('1/14 Tenants...')
  const tenants = await source.$queryRawUnsafe(`SELECT * FROM "tenants"`)
  await copyTable('tenants', tenants)

  // 2. Usuários (FK root — criadores de rodadas, agendamentos etc.)
  log('2/14 Usuários...')
  const usuarios = await source.$queryRawUnsafe(`SELECT * FROM "usuarios"`)
  await copyTable('usuarios', usuarios)

  // 3. Blocos (FK: tenantId)
  log('3/14 Blocos...')
  const blocos = await source.$queryRawUnsafe(`SELECT * FROM "blocos_tenant"`)
  await copyTable('blocos_tenant', blocos)

  // 4. Ambientes (FK: tenantId, blocoId)
  log('4/14 Ambientes...')
  const ambientes = await source.$queryRawUnsafe(`SELECT * FROM "ambientes_tenant"`)
  await copyTable('ambientes_tenant', ambientes)

  // 5. Pessoas (FK: tenantId)
  log('5/14 Pessoas...')
  const pessoas = await source.$queryRawUnsafe(`SELECT * FROM "pessoas"`)
  await copyTable('pessoas', pessoas)

  // 6. Movimentações (FK: tenantId, pessoaId, ambienteId)
  log('6/14 Movimentações...')
  const movs = await source.$queryRawUnsafe(`SELECT * FROM "movimentacoes"`)
  await copyTable('movimentacoes', movs)

  // 7. Rodadas (FK: tenantId, criadoPorId)
  log('7/14 Rodadas...')
  const rodadas = await source.$queryRawUnsafe(`SELECT * FROM "rodadas"`)
  await copyTable('rodadas', rodadas)

  // 8. Rondas Ocorrências (FK: tenantId, rodadaId)
  log('8/14 Rondas Ocorrências...')
  const rondOcorr = await source.$queryRawUnsafe(`SELECT * FROM "rondas_ocorrencias"`)
  await copyTable('rondas_ocorrencias', rondOcorr)

  // 9. Rondas Draft (FK: tenantId, rodadaId, criadoPorId)
  log('9/14 Rondas Draft...')
  const drafts = await source.$queryRawUnsafe(`SELECT * FROM "rondas_draft"`)
  await copyTable('rondas_draft', drafts)

  // 10. Registros Ambientes (FK: rondaOcorrenciaId, ambienteId)
  log('10/14 Registros Ambientes...')
  const regs = await source.$queryRawUnsafe(`SELECT * FROM "registros_ambientes"`)
  await copyTable('registros_ambientes', regs)

  // 11. Ocorrências Detalhe (FK: registroAmbienteId, bemId)
  log('11/14 Ocorrências Detalhe...')
  const ocorr = await source.$queryRawUnsafe(`SELECT * FROM "ocorrencias_detalhe"`)
  await copyTable('ocorrencias_detalhe', ocorr)

  // 12. Abastecimentos (FK: tenantId, rodadaId)
  log('12/14 Abastecimentos...')
  const abast = await source.$queryRawUnsafe(`SELECT * FROM "abastecimentos"`)
  await copyTable('abastecimentos', abast)

  // 13. Agendamentos Manutenção (FK: tenantId, criadoPorId, bemId)
  log('13/14 Agendamentos Manutenção...')
  const agend = await source.$queryRawUnsafe(`SELECT * FROM "agendamentos_manutencao"`)
  await copyTable('agendamentos_manutencao', agend)

  // 14. Links Públicos Bens (FK: tenantId, bemId)
  log('14/14 Links Públicos Bens...')
  const links = await source.$queryRawUnsafe(`SELECT * FROM "links_publicos_bens"`)
  await copyTable('links_publicos_bens', links)
}

// ──────────────────────────────────────────────────────────
// Fase 3: Validação pós-migração
// ──────────────────────────────────────────────────────────

async function validatePost() {
  log('=== FASE 3: Validação pós-migração ===')
  const tables = [
    'tenants','usuarios','blocos_tenant','ambientes_tenant','pessoas',
    'movimentacoes','rodadas','rondas_ocorrencias','rondas_draft',
    'registros_ambientes','ocorrencias_detalhe','abastecimentos',
    'agendamentos_manutencao','links_publicos_bens'
  ]

  let ok = true
  console.log('\nResultado:')
  console.log('Tabela                    | Origem | Destino | Diff')
  console.log('--------------------------|--------|---------|-----')
  for (const t of tables) {
    const c1 = await count(source, t)
    const c2 = await count(target, t)
    const diff = c2 - c1
    const status = diff >= 0 ? '✓' : '✗ FALTANDO ' + Math.abs(diff)
    if (diff < 0) ok = false
    console.log(t.padEnd(26) + '| ' + String(c1).padEnd(8) + '| ' + String(c2).padEnd(9) + '| ' + status)
  }
  console.log()
  if (ok) {
    log('Migração validada com sucesso!')
    log('Próximo passo: atualizar DATABASE_URL em produção para linensistemDB')
  } else {
    warn('ATENÇÃO: Alguns registros não foram migrados. Revise antes de fazer o cutover.')
  }
  return ok
}

// ──────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────

async function main() {
  log(`Iniciando migração Multi_UnidadesDB → linensistemDB ${DRY_RUN ? '[DRY-RUN]' : '[REAL]'}`)

  try {
    const needsMigration = await validate()
    if (!needsMigration && !DRY_RUN) {
      log('Nada a migrar. Encerrando.')
      return
    }

    await migrate()

    if (!DRY_RUN) {
      await validatePost()
    }

    log('Script concluído.')
  } finally {
    await source.$disconnect()
    await target.$disconnect()
  }
}

main().catch(e => {
  console.error('[FATAL]', e)
  process.exit(1)
})
