const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  for (const tenant of tenants) {
    const schemaName = `tenant_${tenant.id.replace(/-/g, '_')}`;
    try {
      console.log(`Migrating schema ${schemaName}...`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${schemaName}"."Client" ADD COLUMN IF NOT EXISTS "city" TEXT;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${schemaName}"."Client" ADD COLUMN IF NOT EXISTS "state" TEXT;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${schemaName}"."Client" ADD COLUMN IF NOT EXISTS "taxRegime" TEXT;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${schemaName}"."Client" ADD COLUMN IF NOT EXISTS "segment" TEXT;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${schemaName}"."Client" ADD COLUMN IF NOT EXISTS "revenueBracket" TEXT;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${schemaName}"."Client" ADD COLUMN IF NOT EXISTS "hasEconomicGroup" BOOLEAN NOT NULL DEFAULT false;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${schemaName}"."Client" ADD COLUMN IF NOT EXISTS "economicGroupName" TEXT;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${schemaName}"."Client" ADD COLUMN IF NOT EXISTS "monthlyFee" DOUBLE PRECISION;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${schemaName}"."Client" ADD COLUMN IF NOT EXISTS "classification" TEXT;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${schemaName}"."Client" ADD COLUMN IF NOT EXISTS "observations" TEXT;`);
      console.log(`Successfully migrated ${schemaName}.`);
    } catch (err) {
      console.error(`Error migrating ${schemaName}:`, err.message);
    }
  }
  console.log('Migration finished.');
}

main().finally(() => prisma.$disconnect());
