-- AlterTable ambientes_inspecionados: add temAbastecimento column
ALTER TABLE "ambientes_inspecionados" ADD COLUMN "temAbastecimento" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable abastecimentos
CREATE TABLE "abastecimentos" (
    "id" TEXT NOT NULL,
    "ambienteInspecionadoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "tamanho" TEXT NOT NULL,

    CONSTRAINT "abastecimentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "abastecimentos_ambienteInspecionadoId_key" ON "abastecimentos"("ambienteInspecionadoId");

-- AddForeignKey
ALTER TABLE "abastecimentos" ADD CONSTRAINT "abastecimentos_ambienteInspecionadoId_fkey" FOREIGN KEY ("ambienteInspecionadoId") REFERENCES "ambientes_inspecionados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
