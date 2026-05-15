-- Adiciona subtipo de manutenção do bem (apenas para tipo='patrimonio')
ALTER TABLE "manutencoes_realizadas"
  ADD COLUMN "subtipoPatrimonio" TEXT;
