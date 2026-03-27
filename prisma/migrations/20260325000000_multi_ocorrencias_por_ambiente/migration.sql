-- Migration: allow multiple ocorrencias per ambiente (one-to-many)
-- Removes the unique constraint on registroId so a single RegistroAmbiente
-- can have more than one OcorrenciaDetalhe.

-- Drop the unique constraint (was backing the one-to-one relation)
ALTER TABLE "ocorrencias_detalhe" DROP CONSTRAINT IF EXISTS "ocorrencias_detalhe_registroId_key";

-- Add a regular index for query performance
CREATE INDEX IF NOT EXISTS "ocorrencias_detalhe_registroId_idx" ON "ocorrencias_detalhe"("registroId");
