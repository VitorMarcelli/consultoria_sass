import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config();

const globalPrisma = new PrismaClient();

async function main() {
  console.log('🔄 Atualizando todos os schemas de Tenants com as novas tabelas de ciclo...');

  const tenants = await globalPrisma.tenant.findMany();
  
  for (const tenant of tenants) {
    const schemaName = `tenant_${tenant.id.replace(/-/g, '_')}`;
    console.log(`\n🏗️ Atualizando schema: ${schemaName}...`);
    
    const dbUrl = new URL(process.env.DATABASE_URL!);
    dbUrl.searchParams.set('schema', schemaName);
    
    const directUrl = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL!);
    directUrl.searchParams.set('schema', schemaName);
    
    try {
      execSync('npx prisma db push --accept-data-loss --skip-generate', {
        env: { 
          ...process.env, 
          DATABASE_URL: dbUrl.toString(),
          DIRECT_URL: directUrl.toString()
        },
        stdio: 'inherit'
      });
      console.log(`✅ Schema ${schemaName} atualizado.`);
    } catch (err) {
      console.error(`❌ Erro ao atualizar schema ${schemaName}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await globalPrisma.$disconnect();
});
