-- Habilita Row Level Security (RLS), sem nenhuma policy permissiva, nas
-- tabelas do schema "public" (Tenant, User, UserSession, Notification,
-- NotificationPreference, SystemOption, TenantTemplate).
--
-- POR QUE ISSO É NECESSÁRIO
-- O Supabase expõe automaticamente todo o schema "public" via API REST
-- (PostgREST) usando a "anon key" — chave que fica embutida (pública) no
-- bundle JS do frontend, por design do Supabase. O schema foi criado via
-- `prisma db push`, que NÃO habilita RLS nem cria policies. Nesse estado,
-- qualquer pessoa que extraia a anon key do frontend consegue ler e
-- escrever diretamente nestas tabelas via
--   https://<projeto>.supabase.co/rest/v1/User
--   https://<projeto>.supabase.co/rest/v1/UserSession   (inclui refreshToken!)
--   https://<projeto>.supabase.co/rest/v1/Tenant
-- etc., contornando completamente o backend NestJS, o JwtAuthGuard e o
-- TenantAccessGuard.
--
-- Isso é independente e ADICIONAL à correção de isolamento de tenant já
-- aplicada no backend — aquela corrige o backend; este script fecha o
-- acesso direto ao Postgres via a API pública do Supabase.
--
-- POR QUE É SEGURO RODAR
-- O backend (Prisma) conecta ao Postgres via DATABASE_URL/DIRECT_URL como
-- dono das tabelas (ou role com privilégio equivalente para esse projeto).
-- Donos de tabela ignoram RLS por padrão no Postgres — então o backend
-- continua funcionando normalmente depois deste script.
-- Nenhuma policy é criada de propósito: RLS habilitado sem nenhuma policy
-- é "deny-all" para os roles "anon" e "authenticated" do PostgREST.
-- Confirmado no código: o frontend não usa o cliente Supabase para
-- consultar estas tabelas diretamente (só para Auth e para o bucket de
-- Storage "proofs") — então bloquear o acesso REST a elas não quebra
-- nenhuma funcionalidade existente.
--
-- COMO APLICAR
-- Copie e rode este arquivo inteiro no SQL Editor do painel do Supabase
-- do projeto de produção (Project → SQL Editor → New query).

ALTER TABLE "public"."Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TenantTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."UserSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."NotificationPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SystemOption" ENABLE ROW LEVEL SECURITY;

-- Se algum dia o frontend passar a consultar uma destas tabelas
-- diretamente via supabase-js (`.from(...)`), crie uma policy explícita
-- e restrita para aquele caso específico em vez de desabilitar RLS aqui.
