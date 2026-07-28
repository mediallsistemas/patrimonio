-- Status cru do ticket no Trilogo, no momento da importacao.
-- Aditiva: coluna nula, nenhum chamado existente e afetado.
--
-- A traducao do status do Trilogo para o nosso ciclo de vida e interpretacao.
-- Guardando o texto original, um mapeamento errado vira um UPDATE de correcao
-- em vez de informacao perdida.
ALTER TABLE "chamados" ADD COLUMN "trilogoStatusOrigem" TEXT;
