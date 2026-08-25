// Campo de testes do Assistente conversacional, sem ANTHROPIC_API_KEY —
// usa ASSISTANT_AI_MOCK=true (mesmo espírito do COMPLEXITY_AI_MOCK do
// agente de sugestão de notas). Uso: `npm run test:assistant`.
import * as dotenv from 'dotenv';
dotenv.config();
process.env.ASSISTANT_AI_MOCK = 'true';

import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaClientManager } from '../src/prisma/prisma-client-manager';
import { ComplexityService } from '../src/complexity/complexity.service';
import { DashboardService } from '../src/dashboard/dashboard.service';
import { AssistantDataService } from '../src/assistant/data.service';
import { AssistantService } from '../src/assistant/assistant.service';

async function main() {
  const globalPrisma = new PrismaService();
  const manager = new PrismaClientManager();

  const tenant = await globalPrisma.tenant.findUnique({
    where: { slug: 'sevilha-mock-test' },
  });
  if (!tenant) {
    throw new Error('Tenant mock não encontrado — rode "npm run seed:mock" primeiro.');
  }
  console.log(`Tenant: ${tenant.name} (${tenant.id})`);

  const complexityService = new ComplexityService();
  const dashboardService = new DashboardService(globalPrisma, manager, complexityService);
  const dataService = new AssistantDataService(manager, dashboardService);
  const assistantService = new AssistantService(dataService);

  console.log('\n--- Pergunta 1: "Como está a carteira desse escritório?" ---');
  const result = await assistantService.chat(tenant.id, [
    { role: 'user', content: 'Como está a carteira desse escritório?' },
  ]);
  console.log(result.reply);

  await globalPrisma.$disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
