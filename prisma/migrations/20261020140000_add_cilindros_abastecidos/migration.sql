-- Cilindros de cada abastecimento da inspecao de gases, um por tamanho: a
-- unidade pode receber, no mesmo registro, cilindros de capacidades
-- diferentes (ex.: 4 de 3 m3 e 2 de P10).
-- Tabela nova; nada existente e afetado.
--
-- registros_ambientes continua com qtdCilindros (total) e tamCilindro
-- (tamanhos) como resumo. Os registros anteriores a esta tabela ficam so
-- nessas colunas; a aplicacao le as duas formas.
CREATE TABLE "cilindros_abastecidos" (
    "id" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "tamanho" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,

    CONSTRAINT "cilindros_abastecidos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cilindros_abastecidos_registroId_idx" ON "cilindros_abastecidos"("registroId");

ALTER TABLE "cilindros_abastecidos" ADD CONSTRAINT "cilindros_abastecidos_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "registros_ambientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
