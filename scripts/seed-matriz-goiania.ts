/**
 * Cria o tenant da Matriz Mediall — Goiânia (GOIÁS)
 * vinculado ao Trilogo: companyId=4, projeto=SEDE
 *
 * Executar:
 *   npx ts-node --project tsconfig.json scripts/seed-matriz-goiania.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Criando tenant Matriz Mediall Goiânia...')

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'mediall-goiania' },
    update: {
      nome: 'Mediall Brasil — Goiânia (Sede)',
      trilogoCompanyId: 4,
      trilogoProjectName: 'SEDE',
      ativo: true,
    },
    create: {
      slug: 'mediall-goiania',
      nome: 'Mediall Brasil — Goiânia (Sede)',
      trilogoCompanyId: 4,
      trilogoProjectName: 'SEDE',
      ativo: true,
    },
  })

  console.log(`✅ Tenant criado/atualizado: ${tenant.slug} (id: ${tenant.id})`)
  console.log(`   trilogoCompanyId: ${tenant.trilogoCompanyId}`)
  console.log(`   trilogoProjectName: ${tenant.trilogoProjectName}`)

  const senhaHash = await bcrypt.hash('Goiania@2026', 10)

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@mediall-goiania.com.br' },
    update: {},
    create: {
      email: 'admin@mediall-goiania.com.br',
      senhaHash,
      nome: 'Admin Mediall Goiânia',
      role: 'tenant_admin',
      tenantId: tenant.id,
    },
  })

  console.log(`✅ Usuário tenant_admin criado: ${admin.email}`)
  console.log('   Senha inicial: Goiania@2026')
  console.log('🎉 Concluído!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
