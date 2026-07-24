-- Campo removido da UI de finalização de chamados; sem uso real (0 preenchidos
-- na produção verificado antes desta migration) — só afeta a tabela chamados.

ALTER TABLE "chamados" DROP COLUMN "observacaoFinal";
