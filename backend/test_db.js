const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    }
  }
});
async function main() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log("Connected to pooler successfully", result);
  } catch (e) {
    console.error("Pooler failed", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
