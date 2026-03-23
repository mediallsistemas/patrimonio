-- Indexes de performance — aplicar manualmente via:
-- npx prisma db execute --schema=prisma/schema.prisma --file=prisma/migrations/manual_perf_indexes.sql
-- Idempotente: usa IF NOT EXISTS — seguro para re-executar.

-- Pessoa: index por tenantId (face match, listagem)
CREATE INDEX IF NOT EXISTS "pessoas_tenantId_idx"
  ON "public"."pessoas" ("tenantId");

-- Movimentacao: indexes críticos para dashboard, face match e verificações de pendência
CREATE INDEX IF NOT EXISTS "movimentacoes_tenantId_idx"
  ON "public"."movimentacoes" ("tenantId");

CREATE INDEX IF NOT EXISTS "movimentacoes_pessoaId_idx"
  ON "public"."movimentacoes" ("pessoaId");

CREATE INDEX IF NOT EXISTS "movimentacoes_tenantId_tipo_idx"
  ON "public"."movimentacoes" ("tenantId", "tipo");

CREATE INDEX IF NOT EXISTS "movimentacoes_tenantId_dataHora_idx"
  ON "public"."movimentacoes" ("tenantId", "dataHora");

CREATE INDEX IF NOT EXISTS "movimentacoes_pessoaId_tipo_idx"
  ON "public"."movimentacoes" ("pessoaId", "tipo");

-- Rodada: index por tenantId e data (listagem de rondas de gases)
CREATE INDEX IF NOT EXISTS "rodadas_tenantId_idx"
  ON "public"."rodadas" ("tenantId");

CREATE INDEX IF NOT EXISTS "rodadas_tenantId_iniciadoEm_idx"
  ON "public"."rodadas" ("tenantId", "iniciadoEm");

-- RondaOcorrencia: index por tenantId e data (listagem de rondas)
CREATE INDEX IF NOT EXISTS "rondas_ocorrencias_tenantId_idx"
  ON "public"."rondas_ocorrencias" ("tenantId");

CREATE INDEX IF NOT EXISTS "rondas_ocorrencias_tenantId_iniciadoEm_idx"
  ON "public"."rondas_ocorrencias" ("tenantId", "iniciadoEm");
