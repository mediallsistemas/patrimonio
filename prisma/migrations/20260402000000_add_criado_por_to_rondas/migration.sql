-- AlterTable rondas_ocorrencias: add criadoPorId
ALTER TABLE "rondas_ocorrencias" ADD COLUMN "criadoPorId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "rondas_ocorrencias" ALTER COLUMN "criadoPorId" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "rondas_ocorrencias" ADD CONSTRAINT "rondas_ocorrencias_criadoPorId_fkey"
  FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rondas_ocorrencias_criadoPorId_idx" ON "rondas_ocorrencias" ("criadoPorId");
