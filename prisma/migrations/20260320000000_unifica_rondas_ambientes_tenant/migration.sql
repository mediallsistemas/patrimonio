-- Migration: unifica_rondas_ambientes_tenant
-- Adds AmbienteTenant table and gas inspection fields to RegistroAmbiente

-- Tabela de ambientes configuráveis por tenant
CREATE TABLE "ambientes_tenant" (
    "id"        TEXT NOT NULL,
    "tenantId"  TEXT NOT NULL,
    "nome"      TEXT NOT NULL,
    "ordem"     INTEGER NOT NULL DEFAULT 0,
    "ativo"     BOOLEAN NOT NULL DEFAULT true,
    "tipo"      TEXT NOT NULL DEFAULT 'ocorrencia',
    CONSTRAINT "ambientes_tenant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ambientes_tenant_tenantId_idx" ON "ambientes_tenant"("tenantId");

ALTER TABLE "ambientes_tenant"
    ADD CONSTRAINT "ambientes_tenant_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Campos adicionais em registros_ambientes para inspeção de gases
ALTER TABLE "registros_ambientes"
    ADD COLUMN "tipoRegistro"     TEXT NOT NULL DEFAULT 'ocorrencia',
    ADD COLUMN "purezaO2"         DOUBLE PRECISION,
    ADD COLUMN "pressaoO2"        DOUBLE PRECISION,
    ADD COLUMN "pressaoAr"        DOUBLE PRECISION,
    ADD COLUMN "backupLigado"     BOOLEAN,
    ADD COLUMN "temAbastecimento" BOOLEAN,
    ADD COLUMN "qtdCilindros"     INTEGER,
    ADD COLUMN "tamCilindro"      TEXT;

CREATE INDEX "registros_ambientes_rondaId_idx" ON "registros_ambientes"("rondaId");
