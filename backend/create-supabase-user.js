require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function main() {
  const email = 'consultor.mock@sevilha.com.br';
  const password = 'Password123!';
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error('Missing Supabase env vars.');
    process.exit(1);
  }

  console.log(`Tentando criar usuário no Supabase: ${email}`);

  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  if (!response.ok) {
    if (data.msg && data.msg.includes('already registered')) {
        console.log('Usuário já existe no Supabase Auth. Fazendo login para obter UUID...');
        const loginResp = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': anonKey,
            },
            body: JSON.stringify({ email, password })
        });
        const loginData = await loginResp.json();
        if (!loginResp.ok) {
            console.error('Falha ao fazer login:', loginData);
            process.exit(1);
        }
        await linkUserInPrisma(loginData.user.id);
        return;
    }
    console.error('Erro ao criar usuário:', data);
    process.exit(1);
  }

  console.log('Usuário criado no Supabase Auth com sucesso!', data.user?.id || data.id);
  const userId = data.user?.id || data.id;
  
  if (userId) {
    await linkUserInPrisma(userId);
  } else {
    console.error('Nenhum ID retornado:', data);
  }
}

async function linkUserInPrisma(authUserId) {
  const prisma = new PrismaClient();
  try {
    console.log(`\nVinculando o ID ${authUserId} no Prisma...`);

    // Procurar se já existe o mock user na tabela User
    const existingUser = await prisma.user.findFirst({
        where: { email: 'consultor.mock@sevilha.com.br' }
    });

    if (existingUser) {
        if (existingUser.id === authUserId) {
            console.log('ID já está correto na base.');
        } else {
            console.log(`Atualizando ID antigo (${existingUser.id}) para o novo ID do Supabase (${authUserId})`);
            // Como o ID é primary key, temos que deletar e recriar, mas isso pode dar cascade delete.
            // Para ser seguro e evitar cascade, vamos rodar SQL Raw para dar UPDATE cascade ou algo assim.
            // O jeito mais seguro é dar UPDATE via SQL bruto se o driver permitir mudar PK.
            await prisma.$executeRawUnsafe(`UPDATE "User" SET id = '${authUserId}' WHERE email = 'consultor.mock@sevilha.com.br';`);
            console.log('Usuário atualizado com sucesso no banco!');
        }
    } else {
        console.log('Usuário não encontrado na tabela User. Certifique-se de ter rodado o seed-mock.ts primeiro.');
    }
    
    // Auto-confirmar email no Supabase
    console.log('Tentando auto-confirmar email direto pelo banco...');
    try {
        await prisma.$executeRawUnsafe(`UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'consultor.mock@sevilha.com.br';`);
        console.log('Email confirmado no Supabase!');
    } catch (e) {
        console.log('Não foi possível confirmar o email direto pelo banco (falta de permissão schema auth). Ignorando...');
    }

  } catch (error) {
    console.error('Erro ao vincular Prisma:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
