const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const tenantId = 'cc377f7d-e1f8-46b9-8ba0-c80130b1b98d';
  const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
  console.log(`Connecting to ${schemaName}...`);
  
  // Set search path
  await prisma.$executeRawUnsafe(`SET search_path TO "${schemaName}"`);
  
  try {
    const res = await prisma.delivery.findMany({
      include: {
        client: true,
        responsible: true,
        leader: true,
        front: true,
        subdivision: true,
        timeReviews: true,
      },
    });
    console.log("Success! Items:", res.length);
  } catch (e) {
    console.error("Error finding deliveries:");
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
