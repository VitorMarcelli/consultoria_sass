const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSchemas() {
  try {
    const tenants = await prisma.tenant.findMany();
    
    for (const tenant of tenants) {
      const schemaName = `tenant_${tenant.id.replace(/-/g, '_')}`;
      console.log(`Fixing schema: ${schemaName}`);
      
      try {
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${schemaName}"."Delivery" CASCADE;`);
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${schemaName}"."TimeReview" CASCADE;`);
        
        await prisma.$executeRawUnsafe(`
          CREATE TABLE "${schemaName}"."Delivery" (
              "id" TEXT NOT NULL,
              "clientId" TEXT NOT NULL,
              "frontId" TEXT NOT NULL,
              "subdivisionId" TEXT,
              "competence" TEXT NOT NULL,
              "originalName" TEXT NOT NULL,
              "standardizedName" TEXT NOT NULL,
              "deliveryClass" TEXT,
              "deliveryGroup" TEXT,
              "deliveryType" TEXT,
              "periodicity" TEXT,
              "responsibleId" TEXT NOT NULL,
              "leaderId" TEXT,
              "status" TEXT NOT NULL DEFAULT 'PREVISTA',
              "legalDeadline" TIMESTAMP(3),
              "internalDeadline" TIMESTAMP(3),
              "executionDeadline" TIMESTAMP(3),
              "observations" TEXT,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
          )
        `);
        
        await prisma.$executeRawUnsafe(`
          CREATE TABLE "${schemaName}"."TimeReview" (
              "id" TEXT NOT NULL,
              "deliveryId" TEXT NOT NULL,
              "responsibleId" TEXT,
              "currentEstimatedTime" INTEGER,
              "newEstimatedTime" INTEGER,
              "validFrom" TIMESTAMP(3),
              "changeType" TEXT,
              "reason" TEXT,
              "context" TEXT,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "TimeReview_pkey" PRIMARY KEY ("id")
          )
        `);
        
        console.log(`Schema ${schemaName} fixed successfully.`);
      } catch (e) {
        console.error(`Error fixing schema ${schemaName}:`, e);
      }
    }
  } catch (e) {
    console.error("Global error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

fixSchemas();
