/**
 * Reset da senha do super_admin
 * Executar: npx ts-node prisma/reset-admin.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const novaSenha = 'Admin@2026'

  await prisma.usuario.update({
    where: { email: 'admin@mediall.com.br' },
    data: { senhaHash: await bcrypt.hash(novaSenha, 10) },
  })

  console.log('✅ Senha do super_admin redefinida.')
  console.log('   email: admin@mediall.com.br')
  console.log('   senha: Admin@2026')
  console.log('⚠️  Troque a senha após o primeiro login.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
