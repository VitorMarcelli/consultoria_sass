import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Buscando clientes sem CNPJ em todos os tenants...\n');
  const tenants = await prisma.tenant.findMany();
  
  let foundAny = false;

  for (const tenant of tenants) {
    const schemaName = `tenant_${tenant.id.replace(/-/g, '_')}`;
    
    try {
      const clientsWithoutCnpj: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, name, cnpj 
        FROM "${schemaName}"."Client" 
        WHERE cnpj IS NULL OR cnpj = ''
      `);

      if (clientsWithoutCnpj.length > 0) {
        foundAny = true;
        console.log(`📌 Tenant: ${tenant.name} (${schemaName})`);
        clientsWithoutCnpj.forEach(client => {
          console.log(`   - ID: ${client.id} | Nome: ${client.name}`);
        });
        console.log('');
      }
    } catch (error) {
      // Ignore errors if schema doesn't exist yet
    }
  }

  if (!foundAny) {
    console.log('✅ Nenhum cliente sem CNPJ foi encontrado no banco de dados.');
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
