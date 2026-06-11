const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  for (const tenant of tenants) {
    const schemaName = `tenant_${tenant.id.replace(/-/g, '_')}`;
    try {
      console.log(`Verifying schema ${schemaName}...`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${schemaName}"."Client" ADD COLUMN IF NOT EXISTS "tradeName" TEXT;`);
      console.log(`Successfully added tradeName to ${schemaName}.`);
    } catch (err) {
      console.error(`Error migrating ${schemaName}:`, err.message);
    }
  }
  console.log('Migration finished.');
}

main().finally(() => prisma.$disconnect());
