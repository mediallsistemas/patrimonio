/**
 * Seed inicial — cria tenants e usuários de acesso
 * Executar: npx ts-node prisma/seed.ts
 * Ou adicionar ao package.json: "prisma": { "seed": "ts-node prisma/seed.ts" }
 *
 * Hierarquia de roles:
 *   super_admin  → acesso global a todos os tenants, filtrando por tenantSlug
 *   tenant_admin → acesso completo ao próprio tenant (dashboard, analytics, forms)
 *   operator     → apenas submeter formulários (POST /api/feedback/form-responses)
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // ── Criar tenants ────────────────────────────────────────────────────────
  const hrpg = await prisma.tenant.upsert({
    where: { slug: 'hrpg' },
    update: { nome: 'Hospital Regional de Porto Grande' },
    create: { slug: 'hrpg', nome: 'Hospital Regional de Porto Grande' },
  })

  const uei = await prisma.tenant.upsert({
    where: { slug: 'uei' },
    update: {},
    create: { slug: 'uei', nome: 'UEI — Unidade de Emergência Integrada' },
  })

  console.log(`✅ Tenants criados: ${hrpg.slug}, ${uei.slug}`)

  // ── Criar super_admin (sem tenant) ────────────────────────────────────────
  await prisma.usuario.upsert({
    where: { email: 'admin@mediall.com.br' },
    update: {},
    create: {
      email:     'admin@mediall.com.br',
      senhaHash: await bcrypt.hash('Admin@2026', 10),
      nome:      'Super Admin',
      role:      'super_admin',
      tenantId:  null,
    },
  })

  // ── Criar tenant_admin para HRPG ─────────────────────────────────────────
  await prisma.usuario.upsert({
    where: { email: 'admin@hrpg.com.br' },
    update: {},
    create: {
      email:     'admin@hrpg.com.br',
      senhaHash: await bcrypt.hash('Hrpg@2026', 10),
      nome:      'Admin HRPG',
      role:      'tenant_admin',
      tenantId:  hrpg.id,
    },
  })

  // ── Criar tenant_admin para UEI ──────────────────────────────────────────
  await prisma.usuario.upsert({
    where: { email: 'admin@uei.com.br' },
    update: {},
    create: {
      email:     'admin@uei.com.br',
      senhaHash: await bcrypt.hash('Uei@2026', 10),
      nome:      'Admin UEI',
      role:      'tenant_admin',
      tenantId:  uei.id,
    },
  })

  // ── Criar operator de exemplo para HRPG ─────────────────────────────────
  await prisma.usuario.upsert({
    where: { email: 'operador@hrpg.com.br' },
    update: {},
    create: {
      email:     'operador@hrpg.com.br',
      senhaHash: await bcrypt.hash('Hrpg@op2026', 10),
      nome:      'Operador HRPG',
      role:      'operator',
      tenantId:  hrpg.id,
    },
  })

  console.log('✅ Usuários criados:')
  console.log('   super_admin  → admin@mediall.com.br   / Admin@2026')
  console.log('   tenant_admin → admin@hrpg.com.br      / Hrpg@2026   (acessa /hrpg)')
  console.log('   tenant_admin → admin@uei.com.br       / Uei@2026    (acessa /uei)')
  console.log('   operator     → operador@hrpg.com.br   / Hrpg@op2026 (apenas submit de forms)')
  console.log('🎉 Seed concluído!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
