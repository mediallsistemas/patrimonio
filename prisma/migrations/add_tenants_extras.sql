-- Migration: add tenantsExtras to usuarios
-- Apply with: psql $DATABASE_URL -f prisma/migrations/add_tenants_extras.sql

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS "tenantsExtras" TEXT[] NOT NULL DEFAULT '{}';
