-- CreateTable tenants
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateTable usuarios
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'tenant_admin',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- AddForeignKey usuarios → tenants
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Inserir tenant default para associar dados existentes
INSERT INTO "tenants" ("id", "slug", "nome")
  VALUES ('00000000-0000-0000-0000-000000000001', 'hrpg', 'HRPG — Padrão');

-- AlterTable pessoas: add tenantId preenchido com tenant default, depois adicionar FK
ALTER TABLE "pessoas" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "pessoas" DROP CONSTRAINT IF EXISTS "pessoas_cpf_key";
ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_tenantId_cpf_key" UNIQUE ("tenantId", "cpf");
ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Remover default após adicionar FK (tenantId passará a ser obrigatório via app)
ALTER TABLE "pessoas" ALTER COLUMN "tenantId" DROP DEFAULT;

-- AlterTable movimentacoes: add tenantId
ALTER TABLE "movimentacoes" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "movimentacoes" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable rodadas: add tenantId
ALTER TABLE "rodadas" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "rodadas" ALTER COLUMN "tenantId" DROP DEFAULT;

-- AlterTable rondas_ocorrencias: add tenantId
ALTER TABLE "rondas_ocorrencias" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "rondas_ocorrencias" ALTER COLUMN "tenantId" DROP DEFAULT;
