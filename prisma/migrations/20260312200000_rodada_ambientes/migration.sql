-- Drop old tables (no data to preserve)
DROP TABLE IF EXISTS "alteracoes";
DROP TABLE IF EXISTS "inspecoes";

-- CreateTable rodadas
CREATE TABLE "rodadas" (
    "id" TEXT NOT NULL,
    "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadoEm" TIMESTAMP(3),

    CONSTRAINT "rodadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable ambientes_inspecionados
CREATE TABLE "ambientes_inspecionados" (
    "id" TEXT NOT NULL,
    "rodadaId" TEXT NOT NULL,
    "ambiente" TEXT NOT NULL,
    "purezaO2" DOUBLE PRECISION NOT NULL,
    "pressaoO2" DOUBLE PRECISION NOT NULL,
    "pressaoAr" DOUBLE PRECISION NOT NULL,
    "backupLigado" BOOLEAN NOT NULL,
    "temAlteracao" BOOLEAN NOT NULL,
    "concluidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ambientes_inspecionados_pkey" PRIMARY KEY ("id")
);

-- CreateTable alteracoes
CREATE TABLE "alteracoes" (
    "id" TEXT NOT NULL,
    "ambienteInspecionadoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "foto" TEXT,
    "trilogoChamado" BOOLEAN NOT NULL,

    CONSTRAINT "alteracoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alteracoes_ambienteInspecionadoId_key" ON "alteracoes"("ambienteInspecionadoId");

-- AddForeignKey
ALTER TABLE "ambientes_inspecionados" ADD CONSTRAINT "ambientes_inspecionados_rodadaId_fkey" FOREIGN KEY ("rodadaId") REFERENCES "rodadas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alteracoes" ADD CONSTRAINT "alteracoes_ambienteInspecionadoId_fkey" FOREIGN KEY ("ambienteInspecionadoId") REFERENCES "ambientes_inspecionados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
