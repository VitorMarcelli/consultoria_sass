import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Limpando clientes sem CNPJ...');
  const tenants = await prisma.tenant.findMany();
  
  for (const tenant of tenants) {
    const schemaName = `tenant_${tenant.id.replace(/-/g, '_')}`;
    try {
      await prisma.$executeRawUnsafe(`
        DELETE FROM "${schemaName}"."Client" 
        WHERE cnpj IS NULL OR cnpj = ''
      `);
      console.log(`Clientes sem CNPJ deletados no tenant: ${schemaName}`);
    } catch (error) {
      console.error(`Erro ao deletar no tenant ${schemaName}:`, error);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
