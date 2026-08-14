-- Anexos de bens do Trilogo (nota fiscal, manual, laudo, foto...).
-- Tabela nova; nada existente e afetado.
--
-- O bem nao tem tabela local (vive no ERP Trilogo), entao a chave e o
-- trilogoAssetId + snapshots de patrimony/companyId — mesma estrategia de
-- agendamentos_manutencao e manutencoes_realizadas.
--
-- "conteudo" guarda o arquivo em base64, como as demais fotos do sistema.
-- Os tetos de tamanho sao validados na aplicacao (anexos-bens.types.ts).
CREATE TABLE "anexos_bens" (
    "id"             TEXT NOT NULL,
    "tenantId"       TEXT,
    "trilogoAssetId" INTEGER NOT NULL,
    "patrimony"      TEXT NOT NULL,
    "companyId"      INTEGER NOT NULL,
    "nome"           TEXT NOT NULL,
    "mimeType"       TEXT NOT NULL,
    "tamanhoBytes"   INTEGER NOT NULL,
    "descricao"      TEXT,
    "conteudo"       TEXT NOT NULL,
    "criadoPorId"    TEXT NOT NULL,
    "criadoEm"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletadoEm"     TIMESTAMP(3),
    "deletadoPorId"  TEXT,

    CONSTRAINT "anexos_bens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "anexos_bens_tenantId_idx" ON "anexos_bens"("tenantId");
-- Leitura por bem (lista do modal e soma da cota) ignora os removidos.
CREATE INDEX "anexos_bens_trilogoAssetId_deletadoEm_idx" ON "anexos_bens"("trilogoAssetId", "deletadoEm");
CREATE INDEX "anexos_bens_tenantId_trilogoAssetId_idx" ON "anexos_bens"("tenantId", "trilogoAssetId");

-- AddForeignKey
ALTER TABLE "anexos_bens"
  ADD CONSTRAINT "anexos_bens_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "anexos_bens"
  ADD CONSTRAINT "anexos_bens_criadoPorId_fkey"
  FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "anexos_bens"
  ADD CONSTRAINT "anexos_bens_deletadoPorId_fkey"
  FOREIGN KEY ("deletadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
