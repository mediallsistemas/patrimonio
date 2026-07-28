-- Chamado nascido de um ticket do Trilogo guarda o id de origem.
-- Aditiva: coluna nula, nenhum chamado existente e afetado.
-- O indice UNICO e o que torna a sincronizacao idempotente — reexecutar nao duplica.
ALTER TABLE "chamados" ADD COLUMN "trilogoTicketId" INTEGER;

CREATE UNIQUE INDEX "chamados_trilogoTicketId_key" ON "chamados"("trilogoTicketId");
