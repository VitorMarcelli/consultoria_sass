// Campo de testes do Agente de IA de complexidade, sem precisar de
// ANTHROPIC_API_KEY nem de login/JWT real do Supabase — chama o service
// diretamente contra o tenant mock (rode `npm run seed:mock` antes, pelo
// menos uma vez) usando COMPLEXITY_AI_MOCK=true (respostas determinísticas,
// nenhuma chamada real de IA). Uso: `npm run test:ai-agent`.
//
// Exercita o fluxo inteiro: sugestão (NOT_ASSESSED/PARTIAL -> AI_SUGGESTED)
// -> confirmação do consultor (-> ASSESSED) -> CCA/CCR. Reexecutável: cada
// rodada só sobrescreve a mesma classificação de teste.
import * as dotenv from 'dotenv';
dotenv.config();
process.env.COMPLEXITY_AI_MOCK = 'true';

import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaClientManager } from '../src/prisma/prisma-client-manager';
import { ComplexityService } from '../src/complexity/complexity.service';
import { ComplexityAiLlmClient } from '../src/complexity-ai/llm-client';
import { ComplexityAiService } from '../src/complexity-ai/complexity-ai.service';

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

  const schemaName = `tenant_${tenant.id.replace(/-/g, '_')}`;
  const tenantPrisma = manager.getClient(schemaName);

  const client = await tenantPrisma.client.findFirst({
    where: { name: 'Cliente Premium LTDA' },
    include: { frontClassifications: { include: { front: true } } },
  });
  if (!client) throw new Error('Cliente mock não encontrado.');

  const classification = client.frontClassifications[0];
  console.log(
    `Classificação: cliente="${client.name}", frente="${classification.front.name}", estado atual=${classification.assessmentState}`,
  );

  // O seed mock não cria ClientTaxInfo (driver de Volume) — simula aqui o
  // que a importação já teria feito antes deste ponto (Volume é sempre
  // calculado à parte, nunca sugerido pela IA).
  await tenantPrisma.clientFrontClassification.update({
    where: { id: classification.id },
    data: { scoreVolume: 2, volumeSource: 'CALCULATED' },
  });
  console.log('(Volume=2/CALCULATED simulado, como se tivesse vindo de import)');

  const complexityService = new ComplexityService();
  const llmClient = new ComplexityAiLlmClient();
  const service = new ComplexityAiService(manager, complexityService, llmClient);

  console.log('\n--- 1) suggestForClassification (modo mock) ---');
  const suggestResult = await service.suggestForClassification(tenant.id, classification.id);
  console.log(JSON.stringify(suggestResult, null, 2));

  console.log('\n--- 2) acceptSuggestion (confirma como consultor) ---');
  const acceptResult = await service.acceptSuggestion(
    tenant.id,
    classification.id,
    'consultor-mock-id',
  );
  console.log(JSON.stringify(acceptResult, null, 2));

  console.log('\n--- 3) calculateCoefficients (CCA/CCR) ---');
  const final = await tenantPrisma.clientFrontClassification.findUnique({
    where: { id: classification.id },
  });
  const coefficients = complexityService.calculateCoefficients([
    {
      assessmentState: final!.assessmentState as any,
      normalizedScore: final!.normalizedScore,
      primaryOwnerId: final!.operator1Id,
    },
  ]);
  console.log(JSON.stringify(coefficients, null, 2));

  await globalPrisma.$disconnect();
  await tenantPrisma.$disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
