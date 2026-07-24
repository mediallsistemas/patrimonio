-- Domínio: chamados de manutenção (somente aditivo — nada de outros domínios)

-- CreateTable
CREATE TABLE "chamados" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "criadoPorId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL DEFAULT 'media',
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "prazo" TIMESTAMP(3) NOT NULL,
    "ambienteId" TEXT,
    "ambienteNomeSnapshot" TEXT,
    "blocoNomeSnapshot" TEXT,
    "trilogoAssetId" INTEGER,
    "patrimony" TEXT,
    "descricaoBemSnapshot" TEXT,
    "fotoAbertura" TEXT,
    "responsavelId" TEXT,
    "atribuidoPorId" TEXT,
    "assumidoEm" TIMESTAMP(3),
    "descricaoExecucao" TEXT,
    "fotoExecucao" TEXT,
    "observacaoFinal" TEXT,
    "finalizadoEm" TIMESTAMP(3),
    "finalizadoPorId" TEXT,
    "fornecedor" TEXT,
    "numeroOrdemCompra" TEXT,
    "valorGastoCentavos" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "atualizadoPorId" TEXT,

    CONSTRAINT "chamados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chamados_numero_key" ON "chamados"("numero");

-- CreateIndex
CREATE INDEX "chamados_tenantId_status_idx" ON "chamados"("tenantId", "status");

-- CreateIndex
CREATE INDEX "chamados_tenantId_prioridade_idx" ON "chamados"("tenantId", "prioridade");

-- CreateIndex
CREATE INDEX "chamados_tenantId_prazo_idx" ON "chamados"("tenantId", "prazo");

-- CreateIndex
CREATE INDEX "chamados_tenantId_criadoEm_idx" ON "chamados"("tenantId", "criadoEm");

-- CreateIndex
CREATE INDEX "chamados_responsavelId_status_idx" ON "chamados"("responsavelId", "status");

-- AddForeignKey
ALTER TABLE "chamados" ADD CONSTRAINT "chamados_ambienteId_fkey" FOREIGN KEY ("ambienteId") REFERENCES "ambientes_tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chamados" ADD CONSTRAINT "chamados_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chamados" ADD CONSTRAINT "chamados_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chamados" ADD CONSTRAINT "chamados_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
