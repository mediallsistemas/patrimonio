import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXPIRACAO_RONDA_MS = 24 * 60 * 60 * 1000;

async function main() {
  const limite = new Date(Date.now() - EXPIRACAO_RONDA_MS);
  const expiradas = await prisma.$executeRaw`
    UPDATE rondas_ocorrencias
    SET "finalizadoEm" = NOW()
    WHERE "finalizadoEm" IS NULL
      AND "atualizadoEm" < ${limite}
  `;
  console.log(`✅ ${expiradas} ronda(s) expirada(s)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
