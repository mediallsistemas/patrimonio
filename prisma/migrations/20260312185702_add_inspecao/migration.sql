-- CreateTable
CREATE TABLE "inspecoes" (
    "id" TEXT NOT NULL,
    "ambiente" TEXT NOT NULL,
    "purezaO2" DOUBLE PRECISION NOT NULL,
    "pressaoO2" DOUBLE PRECISION NOT NULL,
    "pressaoAr" DOUBLE PRECISION NOT NULL,
    "backupLigado" BOOLEAN NOT NULL,
    "temAlteracao" BOOLEAN NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspecoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alteracoes" (
    "id" TEXT NOT NULL,
    "inspecaoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "foto" TEXT,
    "trilogoChamado" BOOLEAN NOT NULL,

    CONSTRAINT "alteracoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alteracoes_inspecaoId_key" ON "alteracoes"("inspecaoId");

-- AddForeignKey
ALTER TABLE "alteracoes" ADD CONSTRAINT "alteracoes_inspecaoId_fkey" FOREIGN KEY ("inspecaoId") REFERENCES "inspecoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
