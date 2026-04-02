-- CreateTable (if not exists)
CREATE TABLE IF NOT EXISTS "agendamentos_manutencao" (
    "id" TEXT NOT NULL,
    "trilogoAssetId" INTEGER NOT NULL,
    "patrimony" TEXT NOT NULL,
    "descricaoBem" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "companyName" TEXT NOT NULL,
    "ambiente" TEXT NOT NULL,
    "dataAgendada" TIMESTAMP(3) NOT NULL,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "titulo" TEXT NOT NULL DEFAULT 'Manutenção',
    "criadoPorId" TEXT NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "atualizadoPorId" TEXT,

    CONSTRAINT "agendamentos_manutencao_pkey" PRIMARY KEY ("id")
);

-- AlterTable (add column only if table already existed without it)
ALTER TABLE "agendamentos_manutencao" ADD COLUMN IF NOT EXISTS "dataRealizada" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "agendamentos_manutencao" ADD CONSTRAINT "agendamentos_manutencao_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (optional)
ALTER TABLE "agendamentos_manutencao" ADD CONSTRAINT "agendamentos_manutencao_atualizadoPorId_fkey" FOREIGN KEY ("atualizadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
