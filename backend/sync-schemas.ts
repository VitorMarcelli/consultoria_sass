import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching all tenants...');
  const tenants = await prisma.tenant.findMany();
  
  for (const tenant of tenants) {
    const schemaName = `tenant_${tenant.id.replace(/-/g, '_')}`;
    console.log(`\nSyncing schema: ${schemaName}...`);
    
    // Construct new DB URL with schema
    const dbUrl = process.env.DATABASE_URL;
    const directUrl = process.env.DIRECT_URL;
    if (!dbUrl) throw new Error('DATABASE_URL not set');
    
    const url = new URL(dbUrl);
    url.searchParams.set('schema', schemaName);

    const dUrl = directUrl ? new URL(directUrl) : new URL(dbUrl);
    dUrl.searchParams.set('schema', schemaName);
    
    try {
      execSync('npx prisma db push --accept-data-loss', {
        env: {
          ...process.env,
          DATABASE_URL: url.toString(),
          DIRECT_URL: dUrl.toString()
        },
        stdio: 'inherit'
      });
      console.log(`Successfully synced ${schemaName}`);
    } catch (error) {
      console.error(`Failed to sync ${schemaName}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
