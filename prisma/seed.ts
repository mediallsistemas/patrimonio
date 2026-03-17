/**
 * Seed inicial — cria tenants e usuários de acesso
 * Executar: npx ts-node prisma/seed.ts
 * Ou adicionar ao package.json: "prisma": { "seed": "ts-node prisma/seed.ts" }
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // ── Criar tenants ────────────────────────────────────────────────────────
  const hrpg = await prisma.tenant.upsert({
    where: { slug: 'hrpg' },
    update: {},
    create: { slug: 'hrpg', nome: 'Hospital Regional de Porto Geral' },
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

  console.log('✅ Usuários criados:')
  console.log('   super_admin  → admin@mediall.com.br  / Admin@2026')
  console.log('   tenant_admin → admin@hrpg.com.br     / Hrpg@2026  (acessa /hrpg)')
  console.log('   tenant_admin → admin@uei.com.br      / Uei@2026   (acessa /uei)')
  console.log('🎉 Seed concluído!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
