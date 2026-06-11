import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const admin = await p.user.findFirst({
    where: { role: 'ADMIN' },
    include: { tenant: true }
  });
  
  if (admin) {
    console.log(`User exists: ${admin.email} (Tenant: ${admin.tenant?.name})`);
  } else {
    console.log('No admin found');
  }
}

main().catch(console.error).finally(() => p.$disconnect());
