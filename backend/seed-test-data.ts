import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const globalPrisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando processo de Seeding para testes...');

  // 1. Pegar o primeiro Tenant disponível no sistema
  const tenant = await globalPrisma.tenant.findFirst();
  
  if (!tenant) {
    console.error('❌ Nenhum Escritório (Tenant) encontrado no banco de dados. Cadastre um escritório primeiro pela interface.');
    process.exit(1);
  }

  console.log(`✅ Escritório selecionado: ${tenant.name} (ID: ${tenant.id})`);

  // 2. Conectar no schema específico desse Tenant
  const schemaName = `tenant_${tenant.id.replace(/-/g, '_')}`;
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL não configurada no .env');

  const urlWithSchema = new URL(databaseUrl);
  urlWithSchema.searchParams.set('schema', schemaName);

  const tenantPrisma = new PrismaClient({
    datasources: {
      db: {
        url: urlWithSchema.toString(),
      },
    },
  });

  console.log(`🔌 Conectado ao schema: ${schemaName}`);

  try {
    // 3. Limpar dados anteriores para evitar duplicação (Cuidado em produção!)
    console.log('🧹 Limpando dados antigos do schema...');
    await tenantPrisma.clientCycleSnapshot.deleteMany({});
    await tenantPrisma.employeeCycleAllocation.deleteMany({});
    await tenantPrisma.managementCycle.deleteMany({});
    await tenantPrisma.clientFrontClassification.deleteMany({});
    await tenantPrisma.client.deleteMany({});
    await tenantPrisma.subdivision.deleteMany({});
    await tenantPrisma.employee.deleteMany({});
    await tenantPrisma.operationalFront.deleteMany({});

    // 4. Criar Frentes Operacionais e Células
    console.log('🏗️ Criando Frentes e Células...');
    const frontFiscal = await tenantPrisma.operationalFront.create({
      data: { name: 'Fiscal' }
    });
    const frontDP = await tenantPrisma.operationalFront.create({
      data: { name: 'Departamento Pessoal' }
    });
    const frontContabil = await tenantPrisma.operationalFront.create({
      data: { name: 'Contábil' }
    });

    const subFiscal1 = await tenantPrisma.subdivision.create({
      data: { frontId: frontFiscal.id, name: 'Célula Fiscal A' }
    });
    const subDP1 = await tenantPrisma.subdivision.create({
      data: { frontId: frontDP.id, name: 'Célula DP Estratégico' }
    });
    const subContabil1 = await tenantPrisma.subdivision.create({
      data: { frontId: frontContabil.id, name: 'Célula Contábil Lucro Real' }
    });

    // 5. Criar Colaboradores
    console.log('👥 Criando Equipe...');
    const employees = [];
    const roles = ['Líder', 'Analista Sênior', 'Analista Pleno', 'Assistente'];
    for (let i = 1; i <= 6; i++) {
      const emp = await tenantPrisma.employee.create({
        data: {
          name: `Colaborador Teste ${i}`,
          role: roles[i % roles.length],
          grossSalary: 3000 + (i * 500)
        }
      });
      employees.push(emp);
    }

    // 6. Criar Clientes (Base de Clientes)
    console.log('🏢 Criando Base de Clientes (20 clientes fictícios)...');
    const clients = [];
    const regimes = ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'];
    const segmentos = ['Comércio', 'Indústria', 'Serviços', 'Tecnologia'];
    const classificacoes = ['A', 'B', 'C'];

    for (let i = 1; i <= 20; i++) {
      const regime = regimes[i % regimes.length];
      const segment = segmentos[i % segmentos.length];
      const clazz = classificacoes[i % classificacoes.length];
      const monthlyFee = 1000 + (Math.random() * 4000); // 1000 a 5000

      const client = await tenantPrisma.client.create({
        data: {
          name: `Empresa Fictícia ${i} LTDA`,
          tradeName: `Nome Fantasia ${i}`,
          cnpj: `00.000.000/0001-${i.toString().padStart(2, '0')}`,
          city: 'São Paulo',
          state: 'SP',
          taxRegime: regime,
          segment: segment,
          status: 'ACTIVE',
          monthlyFee: Math.round(monthlyFee),
          classification: clazz,
          contactName: `Contato ${i}`
        }
      });
      clients.push(client);

      // Vincular a pelo menos 2 frentes
      await tenantPrisma.clientFrontClassification.create({
        data: {
          clientId: client.id,
          frontId: frontFiscal.id,
          subdivisionId: subFiscal1.id,
          actsInFront: 'YES',
          complexity: (i % 3) + 1, // 1 a 3
          frequency: 'Mensal'
        }
      });
      
      await tenantPrisma.clientFrontClassification.create({
        data: {
          clientId: client.id,
          frontId: frontContabil.id,
          subdivisionId: subContabil1.id,
          actsInFront: 'YES',
          complexity: (i % 3) + 1,
          frequency: 'Mensal'
        }
      });
    }

    // 7. Criar Ciclo Mensal
    console.log('🔄 Criando Ciclo Mensal (Gestão de Ciclo)...');
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const cycle = await tenantPrisma.managementCycle.create({
      data: {
        month: currentMonth,
        year: currentYear,
        status: 'OPEN'
      }
    });

    // 8. Criar Snapshots do Ciclo (Tirando "foto" dos clientes para este ciclo)
    console.log('📸 Gerando Snapshots da Base de Clientes para o Ciclo...');
    const fronts = [frontFiscal, frontDP, frontContabil];
    
    for (const client of clients) {
      // Para cada cliente, cria snapshots nas frentes (simulando que estão ativos no ciclo)
      for (const front of [frontFiscal, frontContabil]) {
        await tenantPrisma.clientCycleSnapshot.create({
          data: {
            cycleId: cycle.id,
            clientId: client.id,
            frontId: front.id,
            taxRegime: client.taxRegime,
            segment: client.segment,
            classification: client.classification,
            monthlyFee: client.monthlyFee,
            complexity: (Math.floor(Math.random() * 3) + 1), // Aleatório 1-3
            frequency: 'Mensal'
          }
        });
      }
    }

    // 9. Alocar Equipe no Ciclo
    console.log('👨‍💻 Alocando Equipe no Ciclo...');
    for (const emp of employees) {
      await tenantPrisma.employeeCycleAllocation.create({
        data: {
          cycleId: cycle.id,
          employeeId: emp.id,
          frontId: fronts[Math.floor(Math.random() * fronts.length)].id,
          dailyAvailableTime: 8,
          status: 'ACTIVE'
        }
      });
    }

    console.log('✨ SEED FINALIZADO COM SUCESSO! O banco de dados do tenant está populado.');

  } catch (error) {
    console.error('❌ Erro durante o seeding do tenant:', error);
  } finally {
    await tenantPrisma.$disconnect();
    await globalPrisma.$disconnect();
  }
}

main().catch(console.error);
