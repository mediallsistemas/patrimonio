/**
 * Seed de blocos e ambientes para o HRPG
 * Executar: npx ts-node --project tsconfig.json scripts/seed-hrpg-ambientes.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const HRPG_SLUG = 'hrpg'

const ESTRUTURA = [
  {
    nome: 'Bloco Cirúrgico',
    ordem: 0,
    ambientes: [
      { nome: 'Sala Cirúrgica 1', tipo: 'ocorrencia', ordem: 0 },
      { nome: 'Sala Cirúrgica 2', tipo: 'ocorrencia', ordem: 1 },
      { nome: 'Sala de Recuperação', tipo: 'ocorrencia', ordem: 2 },
      { nome: 'Central de Esterilização', tipo: 'ocorrencia', ordem: 3 },
    ],
  },
  {
    nome: 'UTI',
    ordem: 1,
    ambientes: [
      { nome: 'UTI Adulto', tipo: 'ocorrencia', ordem: 0 },
      { nome: 'UTI Neonatal', tipo: 'ocorrencia', ordem: 1 },
      { nome: 'Central de Gases UTI', tipo: 'gases', ordem: 2 },
    ],
  },
  {
    nome: 'Internação',
    ordem: 2,
    ambientes: [
      { nome: 'Ala A', tipo: 'ocorrencia', ordem: 0 },
      { nome: 'Ala B', tipo: 'ocorrencia', ordem: 1 },
      { nome: 'Ala Pediátrica', tipo: 'ocorrencia', ordem: 2 },
      { nome: 'Ala Maternidade', tipo: 'ocorrencia', ordem: 3 },
    ],
  },
  {
    nome: 'Pronto-Socorro',
    ordem: 3,
    ambientes: [
      { nome: 'Triagem', tipo: 'ocorrencia', ordem: 0 },
      { nome: 'Sala de Emergência', tipo: 'ocorrencia', ordem: 1 },
      { nome: 'Sala de Observação', tipo: 'ocorrencia', ordem: 2 },
    ],
  },
  {
    nome: 'Apoio Diagnóstico',
    ordem: 4,
    ambientes: [
      { nome: 'Laboratório', tipo: 'ocorrencia', ordem: 0 },
      { nome: 'Radiologia', tipo: 'ocorrencia', ordem: 1 },
      { nome: 'Ultrassonografia', tipo: 'ocorrencia', ordem: 2 },
    ],
  },
  {
    nome: 'Infraestrutura',
    ordem: 5,
    ambientes: [
      { nome: 'Central de Gases Principal', tipo: 'gases', ordem: 0 },
      { nome: 'Casa de Máquinas', tipo: 'ocorrencia', ordem: 1 },
      { nome: 'Almoxarifado', tipo: 'ocorrencia', ordem: 2 },
    ],
  },
] as const

async function main() {
  console.log('🌱 Criando blocos e ambientes para HRPG...')

  const tenant = await prisma.tenant.findUnique({ where: { slug: HRPG_SLUG } })
  if (!tenant) {
    console.error(`❌ Tenant "${HRPG_SLUG}" não encontrado. Execute o seed principal primeiro.`)
    process.exit(1)
  }

  for (const bloco of ESTRUTURA) {
    const blocoExistente = await prisma.blocoTenant.findFirst({
      where: { tenantId: tenant.id, nome: bloco.nome },
    })

    const blocoDb = blocoExistente ?? await prisma.blocoTenant.create({
      data: { tenantId: tenant.id, nome: bloco.nome, ordem: bloco.ordem },
    })

    for (const amb of bloco.ambientes) {
      const ambExistente = await prisma.ambienteTenant.findFirst({
        where: { tenantId: tenant.id, blocoId: blocoDb.id, nome: amb.nome },
      })
      if (!ambExistente) {
        await prisma.ambienteTenant.create({
          data: { tenantId: tenant.id, blocoId: blocoDb.id, nome: amb.nome, tipo: amb.tipo, ordem: amb.ordem },
        })
      }
    }
    console.log(`  ✅ ${bloco.nome} (${bloco.ambientes.length} ambientes)`)
  }

  console.log('🎉 Blocos e ambientes criados!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
