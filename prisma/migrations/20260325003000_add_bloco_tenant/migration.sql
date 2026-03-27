-- CreateTable: BlocoTenant
CREATE TABLE "blocos_tenant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "blocos_tenant_pkey" PRIMARY KEY ("id")
);

-- AddColumn: blocoId in ambientes_tenant
ALTER TABLE "ambientes_tenant" ADD COLUMN "blocoId" TEXT;

-- CreateIndex
CREATE INDEX "blocos_tenant_tenantId_idx" ON "blocos_tenant"("tenantId");
CREATE INDEX "ambientes_tenant_blocoId_idx" ON "ambientes_tenant"("blocoId");

-- AddForeignKey
ALTER TABLE "blocos_tenant" ADD CONSTRAINT "blocos_tenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ambientes_tenant" ADD CONSTRAINT "ambientes_tenant_blocoId_fkey" FOREIGN KEY ("blocoId") REFERENCES "blocos_tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
