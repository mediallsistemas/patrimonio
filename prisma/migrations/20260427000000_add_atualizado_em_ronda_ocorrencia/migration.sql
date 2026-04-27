-- AlterTable: adiciona atualizadoEm à rondas_ocorrencias para rastrear atividade
ALTER TABLE "rondas_ocorrencias" ADD COLUMN "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- CreateIndex: acelera query de expiração (filtrar finalizadoEm IS NULL)
CREATE INDEX "rondas_ocorrencias_finalizadoEm_idx" ON "rondas_ocorrencias"("finalizadoEm");
