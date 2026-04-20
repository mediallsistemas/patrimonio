-- AlterTable usuarios: add atualizadoEm (required by Prisma @updatedAt — was missing from initial migration)
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
