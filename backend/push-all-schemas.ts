import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config();

const globalPrisma = new PrismaClient();

async function main() {
  const tenants = await globalPrisma.tenant.findMany();
  console.log(`Found ${tenants.length} tenants. Pushing schema...`);

  // Push to global (public) schema
  console.log('Pushing global schema...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });

  for (const tenant of tenants) {
    const schemaName = `tenant_${tenant.id.replace(/-/g, '_')}`;
    const dbUrl = new URL(process.env.DATABASE_URL!);
    dbUrl.searchParams.set('schema', schemaName);
    
    const directUrl = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL!);
    directUrl.searchParams.set('schema', schemaName);
    
    console.log(`Pushing schema for ${schemaName}...`);
    try {
      execSync('npx prisma db push --accept-data-loss', {
        env: { 
          ...process.env, 
          DATABASE_URL: dbUrl.toString(),
          DIRECT_URL: directUrl.toString()
        },
        stdio: 'inherit'
      });
    } catch (err) {
      console.error(`Failed to push schema for ${schemaName}`);
    }
  }

  console.log('Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('Done!');
}

main().catch(console.error).finally(() => globalPrisma.$disconnect());
