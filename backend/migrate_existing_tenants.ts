import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching all tenants...');
  const tenants = await prisma.tenant.findMany();
  
  for (const tenant of tenants) {
    const schemaName = `tenant_${tenant.id.replace(/-/g, '_')}`;
    console.log(`Migrating schema: ${schemaName}...`);
    
    const alterTableSQL = `
      ALTER TABLE "${schemaName}"."Client"
      ADD COLUMN IF NOT EXISTS "email" TEXT,
      ADD COLUMN IF NOT EXISTS "phone" TEXT,
      ADD COLUMN IF NOT EXISTS "contactName" TEXT,
      ADD COLUMN IF NOT EXISTS "address" TEXT,
      ADD COLUMN IF NOT EXISTS "neighborhood" TEXT,
      ADD COLUMN IF NOT EXISTS "zipCode" TEXT,
      ADD COLUMN IF NOT EXISTS "ie" TEXT,
      ADD COLUMN IF NOT EXISTS "im" TEXT,
      ADD COLUMN IF NOT EXISTS "cnae" TEXT,
      ADD COLUMN IF NOT EXISTS "foundationDate" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "certificateExpiration" TIMESTAMP(3);
    `;
    
    try {
      await prisma.$executeRawUnsafe(alterTableSQL);
      console.log(`Successfully migrated ${schemaName}`);
    } catch (error) {
      console.error(`Failed to migrate ${schemaName}:`, error);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
