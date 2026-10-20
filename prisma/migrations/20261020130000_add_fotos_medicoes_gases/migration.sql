-- Foto do relogio (analisador de O2 / manometro) de cada medicao da inspecao de
-- gases, para o operador guardar o registro do valor que leu.
-- Tabela nova; nada existente e afetado.
--
-- Uma foto por medicao ("purezaO2", "pressaoO2", "pressaoAr") de um registro
-- de ambiente. Fica fora de registros_ambientes porque o detalhe da ronda traz
-- os registros inteiros e passaria a carregar base64 sem pedir.
--
-- "foto" guarda a imagem em base64, como as demais fotos do sistema.
-- O teto de tamanho e validado na aplicacao (rondas.types.ts).
CREATE TABLE "fotos_medicoes_gases" (
    "id" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "medicao" TEXT NOT NULL,
    "foto" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_medicoes_gases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fotos_medicoes_gases_registroId_medicao_key" ON "fotos_medicoes_gases"("registroId", "medicao");

ALTER TABLE "fotos_medicoes_gases" ADD CONSTRAINT "fotos_medicoes_gases_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "registros_ambientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
