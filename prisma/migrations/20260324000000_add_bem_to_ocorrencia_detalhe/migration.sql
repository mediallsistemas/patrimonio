-- Add bem_patrimony and bem_descricao to ocorrencias_detalhe
ALTER TABLE "ocorrencias_detalhe"
  ADD COLUMN IF NOT EXISTS "bemPatrimony" TEXT,
  ADD COLUMN IF NOT EXISTS "bemDescricao"  TEXT;
