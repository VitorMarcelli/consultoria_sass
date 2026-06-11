import { PrismaClient } from '@prisma/client';

const globalPrisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de dados...');

  // Obter o primeiro usuário para descobrir o Tenant
  const user = await globalPrisma.user.findFirst();
  if (!user) {
    console.error('Nenhum usuário encontrado na tabela public.User. Crie uma conta pelo frontend primeiro.');
    process.exit(1);
  }

  const tenantId = user.tenantId;
  const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
  console.log(`📌 Encontrado Tenant: ${tenantId} -> Schema: ${schemaName}`);

  // Configurar Prisma Client para o tenant específico
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is missing');
  
  const fs = require('fs');
  const path = require('path');
  
  const urlWithSchema = new URL(databaseUrl);
  urlWithSchema.searchParams.set('schema', schemaName);

  const tenantPrisma = new PrismaClient({
    datasources: { db: { url: urlWithSchema.toString() } },
  });

  console.log('🧹 Limpando dados antigos do Tenant...');
  await tenantPrisma.subdivision.deleteMany();
  await tenantPrisma.operationalFront.deleteMany();
  await tenantPrisma.client.deleteMany();
  await tenantPrisma.employee.deleteMany();

  // 1. Criar Equipe (Employees)
  console.log('👥 Criando Equipe...');
  const employeesData = [
    { name: 'Ana Paula Goulart', email: 'ana.goulart@consultoria.com', role: 'Gerente Fiscal', grossSalary: 8500, observations: 'Especialista em Lucro Real e reestruturação tributária. Perfil analítico.' },
    { name: 'Carlos Ferreira', email: 'carlos.ferreira@consultoria.com', role: 'Coordenador Contábil', grossSalary: 7200, observations: 'Domina as conciliações bancárias. Precisa de treinamento em IFRS.' },
    { name: 'Mariana Silva', email: 'mariana.silva@consultoria.com', role: 'Analista de DP Pleno', grossSalary: 4500, observations: 'Foco em folha de pagamento e eSocial.' },
    { name: 'Roberto Almeida', email: 'roberto.almeida@consultoria.com', role: 'Analista Fiscal Jr', grossSalary: 3200, observations: 'Entrou recentemente. Está focando no Simples Nacional.' },
    { name: 'Juliana Costa', email: 'juliana.costa@consultoria.com', role: 'Analista Contábil Sênior', grossSalary: 5800, observations: 'Excelente performance, próxima promoção a líder.' },
    { name: 'Fernando Souza', email: 'fernando.souza@consultoria.com', role: 'Assistente Paralegal', grossSalary: 2800, observations: 'Aberturas, alterações e encerramentos de empresas.' }
  ];

  const employees = await Promise.all(
    employeesData.map(e => tenantPrisma.employee.create({ data: e }))
  );
  
  const empId = (name: string) => employees.find(e => e.name === name)?.id;

  // 2. Criar Frentes Operacionais e Células
  console.log('🏢 Criando Estrutura Operacional...');
  
  // FRENTE FISCAL
  const frenteFiscal = await tenantPrisma.operationalFront.create({
    data: { name: 'Departamento Fiscal', status: 'ACTIVE', observations: 'Responsável pela apuração de impostos e entrega de obrigações acessórias.' }
  });

  await tenantPrisma.subdivision.createMany({
    data: [
      { frontId: frenteFiscal.id, name: 'Célula Lucro Real / Presumido', leaderId: empId('Ana Paula Goulart'), status: 'ACTIVE', observations: 'Alta complexidade. SPED Fiscal e EFD Contribuições.' },
      { frontId: frenteFiscal.id, name: 'Célula Simples Nacional', leaderId: empId('Roberto Almeida'), status: 'ACTIVE', observations: 'Alto volume de notas, baixa complexidade.' },
    ]
  });

  // FRENTE CONTÁBIL
  const frenteContabil = await tenantPrisma.operationalFront.create({
    data: { name: 'Departamento Contábil', status: 'ACTIVE', observations: 'Balancetes, ECD, ECF e demonstrações financeiras.' }
  });

  await tenantPrisma.subdivision.createMany({
    data: [
      { frontId: frenteContabil.id, name: 'Fechamentos Mensais', leaderId: empId('Carlos Ferreira'), status: 'ACTIVE' },
      { frontId: frenteContabil.id, name: 'Revisão e Declarações Anuais', leaderId: empId('Juliana Costa'), status: 'ACTIVE' },
    ]
  });

  // FRENTE DP
  const frenteDp = await tenantPrisma.operationalFront.create({
    data: { name: 'Departamento Pessoal', status: 'ACTIVE', observations: 'Folha, rescisões, férias e benefícios.' }
  });

  await tenantPrisma.subdivision.create({
    data: { frontId: frenteDp.id, name: 'Rotinas Mensais', leaderId: empId('Mariana Silva'), status: 'ACTIVE' }
  });

  // FRENTE PARALEGAL
  const frenteParalegal = await tenantPrisma.operationalFront.create({
    data: { name: 'Legalização (Paralegal)', status: 'ACTIVE', observations: 'Alvarás, certidões e Junta Comercial.' }
  });

  await tenantPrisma.subdivision.create({
    data: { frontId: frenteParalegal.id, name: 'Emissão de Certidões', leaderId: empId('Fernando Souza'), status: 'ACTIVE' }
  });


  // 3. Criar Clientes (Consultoria de Sucesso)
  console.log('🤝 Criando Clientes...');
  const clientsData = [
    {
      name: 'TechInovate Soluções em Software S.A.',
      tradeName: 'TechInovate',
      cnpj: '12.345.678/0001-90',
      city: 'São Paulo',
      state: 'SP',
      taxRegime: 'LUCRO_REAL',
      segment: 'Tecnologia / SaaS',
      revenueBracket: '5M - 10M',
      contactName: 'Diretor Financeiro',
      monthlyFee: 5500,
      classification: 'A',
      observations: 'Cliente muito exigente com prazos contábeis. Relatórios gerenciais necessários até o dia 5 útil.'
    },
    {
      name: 'Comercial Varejista Nova Era Ltda',
      tradeName: 'Lojas Nova Era',
      cnpj: '98.765.432/0001-10',
      city: 'Campinas',
      state: 'SP',
      taxRegime: 'LUCRO_PRESUMIDO',
      segment: 'Comércio Varejista',
      revenueBracket: '1M - 5M',
      contactName: 'Gerente Geral',
      monthlyFee: 3200,
      classification: 'B',
      observations: 'Volume alto de notas fiscais de saída. Possui filial no interior.'
    },
    {
      name: 'Consultoria Estratégica Alpha Ltda',
      tradeName: 'Alpha Consulting',
      cnpj: '45.123.890/0001-55',
      city: 'Belo Horizonte',
      state: 'MG',
      taxRegime: 'SIMPLES_NACIONAL',
      segment: 'Serviços B2B',
      revenueBracket: 'Até 1M',
      contactName: 'Sócio Fundador',
      monthlyFee: 1500,
      classification: 'C',
      observations: 'Emissão de notas pelo próprio escritório.'
    },
    {
      name: 'Indústria Metalúrgica Força Total S.A.',
      tradeName: 'Força Total',
      cnpj: '33.444.555/0001-88',
      city: 'Joinville',
      state: 'SC',
      taxRegime: 'LUCRO_REAL',
      segment: 'Indústria',
      revenueBracket: 'Acima de 20M',
      contactName: 'CFO (Marcos)',
      monthlyFee: 12500,
      classification: 'A',
      observations: 'Possui incentivos fiscais estaduais. Processo de importação constante.'
    },
    {
      name: 'Clínica Médica Bem Estar SS',
      tradeName: 'Bem Estar Saúde',
      cnpj: '11.222.333/0001-44',
      city: 'Rio de Janeiro',
      state: 'RJ',
      taxRegime: 'LUCRO_PRESUMIDO',
      segment: 'Saúde',
      revenueBracket: '1M - 5M',
      contactName: 'Dra. Camila',
      monthlyFee: 2800,
      classification: 'B',
      observations: 'Muitos recibos médicos. Atenção à DMED no início do ano.'
    },
    {
      name: 'Agência de Marketing Digital Buzz Ltda',
      tradeName: 'Buzz MKT',
      cnpj: '99.888.777/0001-22',
      city: 'Florianópolis',
      state: 'SC',
      taxRegime: 'SIMPLES_NACIONAL',
      segment: 'Publicidade',
      revenueBracket: 'Até 1M',
      contactName: 'Atendimento',
      monthlyFee: 900,
      classification: 'C',
      observations: 'Pagamento recorrente, baixo trabalho manual.'
    }
  ];

  await Promise.all(
    clientsData.map(c => tenantPrisma.client.create({ data: c }))
  );

  console.log('✅ SEED CONCLUÍDO COM SUCESSO! Dados realistas inseridos nas tabelas de Tenant.');
  await globalPrisma.$disconnect();
  await tenantPrisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
