-- Adiciona a coluna "completedAt" (Data de Entrega/Realização) à tabela
-- Delivery. Aplicado manualmente em produção em todos os schemas que
-- continham Delivery no momento (public + 4 tenants). Mesmo raciocínio de
-- backend/prisma/add-timelog-type-column.sql: ADD COLUMN sem DEFAULT em
-- coluna nullable também é uma operação de metadado no Postgres.
--
-- Rode uma vez por schema de tenant (troque "public" pelo nome do schema).

ALTER TABLE "public"."Delivery" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
