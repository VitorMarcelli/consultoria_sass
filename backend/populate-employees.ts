import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const schemaName = 'tenant_2ffbf5a7_29dc_4631_83d6_8a154774195f';

async function main() {
  console.log(`Connecting to schema: ${schemaName}`);

  const tenantPrisma = new PrismaClient({
    datasources: {
      db: {
        url: `${process.env.DATABASE_URL}?schema=${schemaName}`,
      },
    },
  });

  try {
    const employees = await tenantPrisma.employee.findMany();
    console.log(`Encontrados ${employees.length} colaboradores.`);

    const mockData = [
      {
        level: 'Sênior',
        status: 'ACTIVE',
        observations: 'Excelente desempenho técnico. Liderança em projetos complexos. Necessita aprimorar a comunicação com outras áreas.',
        grossSalary: 8500,
      },
      {
        level: 'Pleno',
        status: 'ACTIVE',
        observations: 'Ótima capacidade analítica. Tem demonstrado evolução constante.',
        grossSalary: 5500,
      },
      {
        level: 'Júnior',
        status: 'ACTIVE',
        observations: 'Proativo e dedicado. Em treinamento nas novas ferramentas de automação.',
        grossSalary: 3500,
      },
      {
        level: 'Pleno',
        status: 'ACTIVE',
        observations: 'Responsável e organizado. Boa gestão de tempo.',
        grossSalary: 6000,
      },
      {
        level: 'Sênior',
        status: 'INACTIVE',
        observations: 'Colaborador de licença até o próximo trimestre.',
        grossSalary: 9000,
      },
      {
        level: 'Júnior',
        status: 'ACTIVE',
        observations: 'Recém contratado. Entregando resultados acima da média esperada.',
        grossSalary: 3000,
      }
    ];

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const data = mockData[i % mockData.length];

      await tenantPrisma.employee.update({
        where: { id: emp.id },
        data: {
          level: data.level,
          status: data.status,
          observations: data.observations,
          grossSalary: data.grossSalary,
        }
      });
      console.log(`Atualizado colaborador ${emp.name} (${emp.id})`);

      // Atualizar alocações do funcionário com dados mock de % de tempo e datas
      const allocations = await tenantPrisma.employeeCycleAllocation.findMany({
        where: { employeeId: emp.id }
      });

      for (const alloc of allocations) {
        // Gerar porcentagens aleatórias
        const predictable = Math.floor(Math.random() * 40) + 20; // 20% a 60%
        const unpredictable = Math.floor(Math.random() * 20) + 10; // 10% a 30%
        
        const start = new Date('2026-01-01');
        const end = new Date('2026-12-31');

        await tenantPrisma.employeeCycleAllocation.update({
          where: { id: alloc.id },
          data: {
            predictableRecurrentTimePercentage: predictable,
            unpredictableRecurrentTimePercentage: unpredictable,
            allocationStartDate: start,
            allocationEndDate: end,
          }
        });
        console.log(` - Atualizada alocação do colaborador na frente ${alloc.frontId}`);
      }
    }

    console.log('População de dados de colaboradores finalizada com sucesso!');
  } catch (error) {
    console.error('Erro ao popular colaboradores:', error);
  } finally {
    await tenantPrisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
