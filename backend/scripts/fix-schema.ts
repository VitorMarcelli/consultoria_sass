import { PrismaClient } from '@prisma/client';

const globalPrisma = new PrismaClient();

async function main() {
  const user = await globalPrisma.user.findFirst();
  if (!user) return;
  
  const schemaName = `tenant_${user.tenantId.replace(/-/g, '_')}`;
  console.log('Fixing schema:', schemaName);

  const tables = [
    `CREATE TABLE IF NOT EXISTS "${schemaName}"."OperationalFront" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "observations" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "OperationalFront_pkey" PRIMARY KEY ("id")
    );`,
    
    `CREATE TABLE IF NOT EXISTS "${schemaName}"."Employee" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT,
      "role" TEXT NOT NULL,
      "grossSalary" DOUBLE PRECISION,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "observations" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
    );`,

    `CREATE TABLE IF NOT EXISTS "${schemaName}"."Subdivision" (
      "id" TEXT NOT NULL,
      "frontId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "leaderId" TEXT,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "observations" TEXT,
      CONSTRAINT "Subdivision_pkey" PRIMARY KEY ("id")
    );`
  ];

  for (const sql of tables) {
    try {
      await globalPrisma.$executeRawUnsafe(sql);
      console.log('Tabela criada com sucesso.');
    } catch (e) {
      console.error(e);
    }
  }

  console.log('Tabelas prontas!');
  await globalPrisma.$disconnect();
}

main();
