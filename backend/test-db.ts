import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.$executeRawUnsafe('SELECT * FROM "tenant_2ffbf5a7_29dc_4631_83d6_8a154774195f"."Employee" LIMIT 1;')
  .then(r => console.log('Query succeeded!', r))
  .catch(e => console.error('Query failed!', e.message))
  .finally(() => p.$disconnect());
