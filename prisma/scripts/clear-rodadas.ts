import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Apagando inspeções de gases...\n");

  const alt = await prisma.alteracao.deleteMany({});
  console.log(`Alteracao:            ${alt.count}`);

  const abast = await prisma.abastecimento.deleteMany({});
  console.log(`Abastecimento:        ${abast.count}`);

  const amb = await prisma.ambienteInspecionado.deleteMany({});
  console.log(`AmbienteInspecionado: ${amb.count}`);

  const rod = await prisma.rodada.deleteMany({});
  console.log(`Rodada:               ${rod.count}`);

  console.log("\nFeito.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
