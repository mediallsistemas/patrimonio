-- Drop and recreate with new schema (key is now companyId+projeto+ambiente)
DROP TABLE IF EXISTS "links_publicos_bens";

CREATE TABLE "links_publicos_bens" (
    "id" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "projeto" TEXT NOT NULL,
    "ambiente" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "links_publicos_bens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "links_publicos_bens_companyId_projeto_ambiente_key"
  ON "links_publicos_bens"("companyId", "projeto", "ambiente");

CREATE INDEX "links_publicos_bens_companyId_idx"
  ON "links_publicos_bens"("companyId");
