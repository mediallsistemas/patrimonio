-- CreateTable: manutencoes_realizadas
CREATE TABLE "manutencoes_realizadas" (
    "id"                   TEXT NOT NULL,
    "tenantId"             TEXT NOT NULL,
    "criadoPorId"          TEXT NOT NULL,
    "tipo"                 TEXT NOT NULL,
    "status"               TEXT NOT NULL DEFAULT 'em_andamento',
    "ambienteId"           TEXT,
    "ambienteNomeSnapshot" TEXT,
    "blocoNomeSnapshot"    TEXT,
    "trilogoAssetId"       INTEGER,
    "patrimony"            TEXT,
    "descricaoBemSnapshot" TEXT,
    "descricao"            TEXT NOT NULL,
    "observacaoFinal"      TEXT,
    "fotoAntes"            TEXT NOT NULL,
    "fotoDepois"           TEXT,
    "iniciadaEm"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadaEm"         TIMESTAMP(3),
    "atualizadoEm"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "manutencoes_realizadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "manutencoes_realizadas_tenantId_status_idx" ON "manutencoes_realizadas"("tenantId", "status");
CREATE INDEX "manutencoes_realizadas_tenantId_tipo_iniciadaEm_idx" ON "manutencoes_realizadas"("tenantId", "tipo", "iniciadaEm");
CREATE INDEX "manutencoes_realizadas_criadoPorId_status_idx" ON "manutencoes_realizadas"("criadoPorId", "status");

-- AddForeignKey
ALTER TABLE "manutencoes_realizadas"
  ADD CONSTRAINT "manutencoes_realizadas_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "manutencoes_realizadas"
  ADD CONSTRAINT "manutencoes_realizadas_criadoPorId_fkey"
  FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "manutencoes_realizadas"
  ADD CONSTRAINT "manutencoes_realizadas_ambienteId_fkey"
  FOREIGN KEY ("ambienteId") REFERENCES "ambientes_tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
