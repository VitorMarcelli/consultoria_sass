const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const users = await prisma.user.findMany();
    console.log("Users:", users.map(u => ({ id: u.id, email: u.email, tenantId: u.tenantId })));
    
    if (users.length > 0 && users[0].tenantId) {
       const schemaName = `tenant_${users[0].tenantId.replace(/-/g, '_')}`;
       console.log(`Checking schema: ${schemaName}`);
       const clients = await prisma.$queryRawUnsafe(`SELECT * FROM "${schemaName}"."Client"`);
       console.log("Clients in tenant schema:", clients);
    }
  } catch(e) {
    console.error("Error:", e);
  }
}
check().finally(() => prisma.$disconnect());
