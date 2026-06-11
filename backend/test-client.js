const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { execSync } = require('child_process');

async function testClient() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error("No user found");
    
    console.log("Found user:", user.email, "tenantId:", user.tenantId);
    
    const schemaName = `tenant_${user.tenantId.replace(/-/g, '_')}`;
    console.log("Schema name:", schemaName);
    
    // We can use raw sql to test insertion
    const result = await prisma.$executeRawUnsafe(`
      INSERT INTO "${schemaName}"."Client" ("id", "name", "cnpj", "status", "createdAt", "updatedAt")
      VALUES ('test-uuid-123', 'Cliente Teste via Script', '123456', 'ACTIVE', NOW(), NOW())
      ON CONFLICT ("id") DO NOTHING;
    `);
    console.log("Insert result:", result);
    
    const fetch = await prisma.$queryRawUnsafe(`SELECT * FROM "${schemaName}"."Client"`);
    console.log("Clients in DB:", fetch);
    
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

testClient();
