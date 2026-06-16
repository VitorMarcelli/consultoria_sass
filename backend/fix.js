const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function fix() {
  const users = await prisma.user.findMany({ where: { role: 'CONSULTANT' } });
  for (const u of users) {
    if (u.tenantId) {
      await prisma.tenant.update({
        where: { id: u.tenantId },
        data: { consultantId: u.id }
      });
      console.log('Fixed tenant ' + u.tenantId);
    }
  }
}
fix().catch(console.error).finally(() => prisma.$disconnect());
