-- CreateTable rondas_draft
CREATE TABLE "rondas_draft" (
    "id"           TEXT        NOT NULL,
    "tenantId"     TEXT        NOT NULL,
    "criadoPorId"  TEXT        NOT NULL,
    "estado"       JSONB       NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rondas_draft_pkey" PRIMARY KEY ("id")
);

-- UniqueConstraint
CREATE UNIQUE INDEX "rondas_draft_tenantId_criadoPorId_key" ON "rondas_draft"("tenantId", "criadoPorId");

-- AddForeignKey
ALTER TABLE "rondas_draft" ADD CONSTRAINT "rondas_draft_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rondas_draft" ADD CONSTRAINT "rondas_draft_criadoPorId_fkey"
  FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
