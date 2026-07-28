-- Fila de tickets do Trilogo que a sincronizacao nao conseguiu importar.
-- Tabela nova, sem FK: nada existente e afetado.
--
-- A janela de busca da sincronizacao e movel (7 dias). Sem esta tabela, o ticket
-- recusado so aparecia no retorno daquela execucao e, passada a janela, deixava
-- de ser buscado — sumia sem ninguem saber.
CREATE TABLE "tickets_trilogo_triagem" (
    "trilogoTicketId" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "statusOrigem" TEXT,
    "descricao" TEXT,
    "endereco" TEXT,
    "companyId" INTEGER,
    "primeiraVezEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimaVezEm" TIMESTAMP(3) NOT NULL,
    "ocorrencias" INTEGER NOT NULL DEFAULT 1,
    "resolvidoEm" TIMESTAMP(3),

    CONSTRAINT "tickets_trilogo_triagem_pkey" PRIMARY KEY ("trilogoTicketId")
);

-- Consulta principal da tela de triagem: pendentes, mais recentes primeiro.
CREATE INDEX "tickets_trilogo_triagem_resolvidoEm_ultimaVezEm_idx"
    ON "tickets_trilogo_triagem"("resolvidoEm", "ultimaVezEm");
