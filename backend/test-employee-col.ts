import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'User' 
        AND column_name = 'employeeId';
    `;
    console.log("public.User employeeId:", result);

    const tenants = await prisma.tenant.findMany();
    if (tenants.length > 0) {
      const schemaName = `tenant_${tenants[0].id.replace(/-/g, '_')}`;
      const result2 = await prisma.$queryRawUnsafe(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = '${schemaName}' 
          AND table_name = 'User' 
          AND column_name = 'employeeId';
      `);
      console.log(`${schemaName}.User employeeId:`, result2);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
