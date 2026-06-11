import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const globalPrisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando Seed do Banco de Dados Mock para M0/M1...');

  const mockSlug = 'sevilha-mock-test';
  const mockEmail = 'consultor.mock@sevilha.com.br';

  // 1. Limpeza Segura
  console.log('🧹 Procurando mock anterior para limpeza segura...');
  const existingTenant = await globalPrisma.tenant.findUnique({
    where: { slug: mockSlug }
  });

  if (existingTenant) {
    const schemaName = `tenant_${existingTenant.id.replace(/-/g, '_')}`;
    console.log(`⚠️ Excluindo schema do mock anterior: ${schemaName}`);
    await globalPrisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`);
    
    console.log(`⚠️ Excluindo dados globais do mock anterior...`);
    await globalPrisma.user.deleteMany({ where: { tenantId: existingTenant.id } });
    await globalPrisma.tenant.delete({ where: { id: existingTenant.id } });
  }

  // 2. Criação da Empresa (Tenant) e Consultor na Camada 1
  console.log('🏢 Criando Escritório Contábil (Tenant)...');
  const tenant = await globalPrisma.tenant.create({
    data: {
      name: 'Contabilidade Sevilha Mock',
      slug: mockSlug,
      cnpj: '00.000.000/0001-99',
      city: 'São Paulo',
      state: 'SP',
      size: 'Médio',
      owner: 'João Sevilha',
      internalResponsible: 'Maria Consultora',
      status: 'MAPPING',
    }
  });

  console.log('👤 Criando Consultor Mock...');
  const user = await globalPrisma.user.create({
    data: {
      id: randomUUID(), // Simulate Supabase Auth ID
      email: mockEmail,
      name: 'Consultor Sevilha Teste',
      role: 'CONSULTANT',
      tenantId: tenant.id,
      status: 'ACTIVE'
    }
  });

  await globalPrisma.tenant.update({
    where: { id: tenant.id },
    data: { consultantId: user.id }
  });

  // 3. Preparação do Schema Dinâmico do Tenant
  const schemaName = `tenant_${tenant.id.replace(/-/g, '_')}`;
  console.log(`🏗️ Criando e empurrando o schema Prisma para o tenant: ${schemaName}...`);
  
  // Utilizar o db push do Prisma para criar todas as tabelas corretamente no schema
  const dbUrl = new URL(process.env.DATABASE_URL!);
  dbUrl.searchParams.set('schema', schemaName);
  
  const directUrl = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL!);
  directUrl.searchParams.set('schema', schemaName);
  
  execSync('npx prisma db push --accept-data-loss --skip-generate', {
    env: { 
      ...process.env, 
      DATABASE_URL: dbUrl.toString(),
      DIRECT_URL: directUrl.toString()
    },
    stdio: 'inherit'
  });

  // 4. Conectar ao Prisma do Schema do Tenant
  const tenantPrisma = new PrismaClient({
    datasources: {
      db: { url: dbUrl.toString() }
    }
  });

  try {
    console.log('🚀 Populando Frentes Operacionais e Subdivisões (M0)...');
    const frontFiscal = await tenantPrisma.operationalFront.create({ data: { name: 'Fiscal' } });
    const frontDP = await tenantPrisma.operationalFront.create({ data: { name: 'DP/Pessoal' } });
    const frontContabil = await tenantPrisma.operationalFront.create({ data: { name: 'Contábil' } });

    const subFiscal01 = await tenantPrisma.subdivision.create({
      data: { name: 'Fiscal 01', frontId: frontFiscal.id }
    });

    console.log('👥 Populando Equipe e Alocações (M0/M1)...');
    const liderFiscal = await tenantPrisma.employee.create({
      data: { name: 'Carlos Líder', email: 'carlos@contabilidade.com', role: 'Líder', grossSalary: 8000 }
    });
    
    const analistaFiscal = await tenantPrisma.employee.create({
      data: { name: 'Ana Analista', email: 'ana@contabilidade.com', role: 'Analista', grossSalary: 4000 }
    });

    const analistaDP = await tenantPrisma.employee.create({
      data: { name: 'Marcos DP', email: 'marcos@contabilidade.com', role: 'Analista', grossSalary: 4000 }
    });

    await tenantPrisma.subdivision.update({
      where: { id: subFiscal01.id },
      data: { leaderId: liderFiscal.id }
    });

    console.log('📁 Populando Carteira de Clientes (M1)...');
    const clienteA = await tenantPrisma.client.create({
      data: { name: 'Cliente Premium LTDA', taxRegime: 'Lucro Real', status: 'ACTIVE' }
    });

    const clienteB = await tenantPrisma.client.create({
      data: { name: 'Comércio Varejo S/A', taxRegime: 'Simples Nacional', status: 'ACTIVE' }
    });

    console.log('🔗 Classificando clientes nas frentes...');
    await tenantPrisma.clientFrontClassification.create({
      data: {
        clientId: clienteA.id,
        frontId: frontFiscal.id,
        actsInFront: 'YES',
        leaderId: liderFiscal.id,
        operator1Id: analistaFiscal.id
      }
    });

    console.log('📦 Inserindo Entregas e Revisões de Tempo (M1)...');
    const entrega1 = await tenantPrisma.delivery.create({
      data: {
        clientId: clienteA.id,
        frontId: frontFiscal.id,
        subdivisionId: subFiscal01.id,
        competence: '05/2026',
        originalName: 'Apuracao ICMS Mensal',
        standardizedName: 'Apuração ICMS',
        deliveryGroup: 'Impostos',
        periodicity: 'Mensal',
        responsibleId: analistaFiscal.id,
        leaderId: liderFiscal.id,
        status: 'PREVISTA'
      }
    });

    // Criando a revisão de tempo para demonstrar histórico evolutivo
    await tenantPrisma.timeReview.create({
      data: {
        deliveryId: entrega1.id,
        responsibleId: analistaFiscal.id,
        currentEstimatedTime: 120, // Tempo antigo
        newEstimatedTime: 90, // Tempo revisado por melhoria
        changeType: 'Revision',
        reason: 'Automação na extração do XML implementada',
        validFrom: new Date()
      }
    });

    console.log('✅ Seed Mock concluído com sucesso!');
    console.log('----------------------------------------------------');
    console.log(`Para testar, faça login com o e-mail: ${mockEmail}`);
    console.log('O Frontend deverá exibir a estrutura completa.');
    console.log('----------------------------------------------------');

  } finally {
    await tenantPrisma.$disconnect();
    await globalPrisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
