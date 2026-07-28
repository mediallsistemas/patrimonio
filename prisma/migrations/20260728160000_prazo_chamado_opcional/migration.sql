-- Prazo do chamado passa a ser opcional.
--
-- Motivo: o ticket do Trilogo frequentemente nao traz deadline — 219 de 868 na
-- amostra de 120 dias de producao, sendo 73 deles ainda abertos. Com prazo
-- obrigatorio esses tickets so podiam ser recusados (some trabalho vivo) ou
-- receber um prazo inventado (atraso falso). Nenhuma das duas serve.
--
-- Aditiva e reversivel enquanto nao houver linha com NULL: nenhum chamado
-- existente e alterado, e a criacao manual continua exigindo prazo na API.
ALTER TABLE "chamados" ALTER COLUMN "prazo" DROP NOT NULL;
