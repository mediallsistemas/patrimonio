-- CreateTable
CREATE TABLE "links_publicos_bens" (
    "id" TEXT NOT NULL,
    "trilogoAssetId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "patrimony" TEXT NOT NULL,
    "descricaoBem" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "links_publicos_bens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "links_publicos_bens_trilogoAssetId_companyId_idx" ON "links_publicos_bens"("trilogoAssetId", "companyId");
