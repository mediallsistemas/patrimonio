import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Apagando ocorrências e inspeções de rondas...\n");

  const ocorrencias = await prisma.ocorrenciaDetalhe.deleteMany({});
  console.log(`✅ OcorrenciaDetalhe: ${ocorrencias.count} registros apagados`);

  const registros = await prisma.registroAmbiente.deleteMany({});
  console.log(`✅ RegistroAmbiente:  ${registros.count} registros apagados`);

  const rondas = await prisma.rondaOcorrencia.deleteMany({});
  console.log(`✅ RondaOcorrencia:   ${rondas.count} registros apagados`);

  console.log("\n✔ Limpeza concluída.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
