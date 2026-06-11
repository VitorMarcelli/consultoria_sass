require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function main() {
  const email = 'admin@sevilha.com.br';
  const password = 'Password123!';
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error('Missing Supabase env vars.');
    process.exit(1);
  }

  console.log(`Tentando criar usuário Admin no Supabase: ${email}`);

  let userId;
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
    if (data.msg && data.msg.includes('already registered') || data.code === 'user_already_exists') {
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
        userId = loginData.user.id;
    } else {
        console.error('Erro ao criar usuário:', data);
        process.exit(1);
    }
  } else {
    console.log('Usuário criado no Supabase Auth com sucesso!', data.user?.id || data.id);
    userId = data.user?.id || data.id;
  }
  
  if (userId) {
    await linkAdminInPrisma(userId, email);
  } else {
    console.error('Nenhum ID retornado:', data);
  }
}

async function linkAdminInPrisma(authUserId, email) {
  const prisma = new PrismaClient();
  try {
    console.log(`\nVinculando o ID ${authUserId} no Prisma...`);

    // Procurar ou criar Tenant "Sevilha Performance" (Empresa Master)
    let masterTenant = await prisma.tenant.findFirst({
        where: { slug: 'sevilha-performance' }
    });

    if (!masterTenant) {
        masterTenant = await prisma.tenant.create({
            data: {
                name: 'Sevilha Performance',
                slug: 'sevilha-performance',
                status: 'ACTIVE'
            }
        });
        console.log('Empresa Master (Sevilha Performance) criada.');
    } else {
        console.log('Empresa Master (Sevilha Performance) já existe.');
    }

    // Procurar se já existe o user na tabela User
    const existingUser = await prisma.user.findFirst({
        where: { email: email }
    });

    if (existingUser) {
        if (existingUser.id === authUserId) {
            console.log('ID já está correto na base. Atualizando role para ADMIN.');
            await prisma.user.update({
                where: { id: authUserId },
                data: { role: 'ADMIN', tenantId: masterTenant.id }
            });
        } else {
            console.log(`Atualizando ID antigo (${existingUser.id}) para o novo ID do Supabase (${authUserId})`);
            await prisma.$executeRawUnsafe(`UPDATE "User" SET id = '${authUserId}', role = 'ADMIN', "tenantId" = '${masterTenant.id}' WHERE email = '${email}';`);
        }
    } else {
        console.log('Usuário não encontrado na tabela User. Criando...');
        await prisma.user.create({
            data: {
                id: authUserId,
                email: email,
                name: 'Administrador Sevilha',
                role: 'ADMIN',
                tenantId: masterTenant.id
            }
        });
        console.log('Usuário Admin criado com sucesso no banco!');
    }
    
    // Auto-confirmar email no Supabase
    console.log('Tentando auto-confirmar email direto pelo banco...');
    try {
        await prisma.$executeRawUnsafe(`UPDATE auth.users SET email_confirmed_at = now() WHERE email = '${email}';`);
        console.log('Email confirmado no Supabase!');
    } catch (e) {
        console.log('Não foi possível confirmar o email direto pelo banco. Ignorando...');
    }

  } catch (error) {
    console.error('Erro ao vincular Prisma:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
