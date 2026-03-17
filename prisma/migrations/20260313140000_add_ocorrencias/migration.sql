-- CreateTable rondas_ocorrencias
CREATE TABLE "rondas_ocorrencias" (
    "id" TEXT NOT NULL,
    "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadoEm" TIMESTAMP(3),

    CONSTRAINT "rondas_ocorrencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable registros_ambientes
CREATE TABLE "registros_ambientes" (
    "id" TEXT NOT NULL,
    "rondaId" TEXT NOT NULL,
    "ambiente" TEXT NOT NULL,
    "temOcorrencia" BOOLEAN NOT NULL,
    "concluidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_ambientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable ocorrencias_detalhe
CREATE TABLE "ocorrencias_detalhe" (
    "id" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "foto" TEXT,
    "trilogoChamado" BOOLEAN NOT NULL,

    CONSTRAINT "ocorrencias_detalhe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ocorrencias_detalhe_registroId_key" ON "ocorrencias_detalhe"("registroId");

-- AddForeignKey
ALTER TABLE "registros_ambientes" ADD CONSTRAINT "registros_ambientes_rondaId_fkey" FOREIGN KEY ("rondaId") REFERENCES "rondas_ocorrencias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencias_detalhe" ADD CONSTRAINT "ocorrencias_detalhe_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "registros_ambientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
