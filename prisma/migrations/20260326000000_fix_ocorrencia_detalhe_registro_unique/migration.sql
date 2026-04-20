-- Remove índice único indevido em ocorrencias_detalhe.registroId
-- Um RegistroAmbiente pode ter múltiplas OcorrenciaDetalhe (múltiplas ocorrências por ambiente)
DROP INDEX IF EXISTS "ocorrencias_detalhe_registroId_key";
