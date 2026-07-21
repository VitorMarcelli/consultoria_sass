-- Adiciona a coluna "type" (RECURRENT | EXTRA | REWORK) à tabela TimeLog.
--
-- Aplicado manualmente em produção em todos os schemas que continham
-- TimeLog no momento (public + 4 tenants). Mantido aqui como registro e
-- para reaplicar em qualquer ambiente novo (staging, restauração de backup,
-- etc.) sem precisar rodar `prisma db push` por schema — ADD COLUMN com
-- DEFAULT é uma operação de metadado no Postgres, não reescreve a tabela.
--
-- Rode uma vez por schema de tenant (troque "public" pelo nome do schema,
-- ex: tenant_<uuid_com_underscore>).

ALTER TABLE "public"."TimeLog" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'RECURRENT';
