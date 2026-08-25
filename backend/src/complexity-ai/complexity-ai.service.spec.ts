import { ComplexityAiService } from './complexity-ai.service';
import { ComplexityService } from '../complexity/complexity.service';
import { ComplexityAiLlmClient } from './llm-client';

// Mocks manuais (sem DI do Nest) — os únicos specs hoje no projeto testam
// funções puras (complexity.rules.spec.ts); este é o primeiro service com
// I/O, então a forma mais simples de isolar é injetar dublês diretamente no
// construtor, sem TestingModule.
function buildFiscalClassification(overrides: Partial<any> = {}) {
  return {
    id: 'classification-1',
    actsInFront: 'YES',
    frequency: 'Mensal',
    particulars: null,
    scoreVolume: 2,
    client: { name: 'Empresa Exemplo Ltda.', status: 'ACTIVE', taxRegime: 'Simples Nacional', segment: 'Serviço' },
    front: { name: 'Fiscal' },
    taxInfo: {
      hasSpecialRegime: false,
      specialRegimeDescription: null,
      automationLevel: 'Automatizada',
      meetsDeadlines: 'Sempre',
      documentReceiptMethod: 'Plataforma integrada',
      documentSendMethod: null,
      integrationMethod: null,
    },
    hrInfo: null,
    accountingInfo: null,
    ...overrides,
  };
}

function buildDeps(overrides: {
  findUnique?: any;
  update?: any;
  generateStructured?: any;
  isConfigured?: boolean;
}) {
  const prismaManager = {
    getClient: jest.fn().mockReturnValue({
      clientFrontClassification: {
        findUnique: jest.fn().mockResolvedValue(overrides.findUnique),
        update: jest.fn().mockImplementation((args) =>
          Promise.resolve({ id: args.where.id, ...args.data }),
        ),
      },
    }),
  } as any;

  const llmClient: Partial<ComplexityAiLlmClient> = {
    isConfigured: jest.fn().mockReturnValue(overrides.isConfigured ?? true),
    generateStructured: jest.fn().mockResolvedValue(overrides.generateStructured),
    modelIdentifier: 'claude-opus-5',
  };

  const service = new ComplexityAiService(
    prismaManager,
    new ComplexityService(),
    llmClient as ComplexityAiLlmClient,
  );

  return { service, prismaManager, llmClient };
}

describe('ComplexityAiService.suggestForClassification', () => {
  it('grava AI_SUGGESTED e calcula a classe quando a IA responde os 3 critérios da Fiscal', async () => {
    const { service, prismaManager } = buildDeps({
      findUnique: buildFiscalClassification(),
      generateStructured: {
        scoreService: { score: 1, justification: 'Contato raro.' },
        scoreTax: { score: 1, justification: 'Simples Nacional, sem particularidades.' },
        scoreOrganization: { score: 1, justification: 'Envio automatizado.' },
      },
    });

    const result = await service.suggestForClassification('tenant-1', 'classification-1');

    expect(result.applied).toBe(true);
    // scoreVolume=2 + scoreService=1 + scoreTax=1 + scoreOrganization=1 = 5 → C1
    expect(result.classification.complexityClass).toBe('C1');
    expect(result.classification.assessmentState).toBe('AI_SUGGESTED');
    expect(result.classification.aiSuggestion.promptVersion).toBeDefined();
    expect(prismaManager.getClient).toHaveBeenCalledWith('tenant_tenant_1');
  });

  it('não força nota quando a IA devolve score null por falta de dado — vira PARTIAL, nunca AI_SUGGESTED', async () => {
    const { service } = buildDeps({
      findUnique: buildFiscalClassification(),
      generateStructured: {
        scoreService: { score: 1, justification: 'Contato raro.' },
        scoreTax: { score: null, justification: 'Sem dado de regime especial suficiente.' },
        scoreOrganization: { score: 1, justification: 'Envio automatizado.' },
      },
    });

    const result = await service.suggestForClassification('tenant-1', 'classification-1');

    expect(result.applied).toBe(true);
    expect(result.classification.assessmentState).toBe('PARTIAL');
    expect(result.classification.complexityClass).toBeNull();
    expect(result.classification.scoreTax).toBeNull();
  });

  it('na frente Pessoal usa Rotatividade no lugar de Tributação, mesmo se a IA devolver scoreTax por engano', async () => {
    const { service } = buildDeps({
      findUnique: buildFiscalClassification({
        front: { name: 'Pessoal' },
        scoreVolume: 1,
        taxInfo: null,
        hrInfo: { frequentAdmissions: false },
      }),
      generateStructured: {
        scoreService: { score: 1, justification: 'Contato raro.' },
        scoreOrganization: { score: 1, justification: 'Envio automatizado.' },
        scoreTurnover: { score: 1, justification: 'Movimentação baixa.' },
        scoreTax: { score: 3, justification: 'Não deveria nem ter sido pedido nesta frente.' },
      },
    });

    const result = await service.suggestForClassification('tenant-1', 'classification-1');

    expect(result.applied).toBe(true);
    expect(result.classification.scoreTax).toBeNull();
    expect(result.classification.scoreTurnover).toBe(1);
    expect(result.classification.assessmentState).toBe('AI_SUGGESTED');
  });

  it('não chama a IA nem grava nada quando o cliente está inativo na frente', async () => {
    const { service, llmClient, prismaManager } = buildDeps({
      findUnique: buildFiscalClassification({ actsInFront: 'NO' }),
    });

    const result = await service.suggestForClassification('tenant-1', 'classification-1');

    expect(result.applied).toBe(false);
    expect(llmClient.generateStructured).not.toHaveBeenCalled();
    expect(
      prismaManager.getClient('tenant_tenant_1').clientFrontClassification.update,
    ).not.toHaveBeenCalled();
  });

  it('retorna applied=false sem lançar erro quando a IA não está configurada', async () => {
    const { service, llmClient } = buildDeps({
      findUnique: buildFiscalClassification(),
      isConfigured: false,
    });

    const result = await service.suggestForClassification('tenant-1', 'classification-1');

    expect(result.applied).toBe(false);
    expect(llmClient.generateStructured).not.toHaveBeenCalled();
  });

  it('retorna applied=false quando o LLM falha (generateStructured resolve null)', async () => {
    const { service } = buildDeps({
      findUnique: buildFiscalClassification(),
      generateStructured: null,
    });

    const result = await service.suggestForClassification('tenant-1', 'classification-1');

    expect(result.applied).toBe(false);
  });
});

describe('ComplexityAiService.acceptSuggestion', () => {
  it('confirma a sugestão da IA como ASSESSED, com assessedById/assessedAt do consultor', async () => {
    const { service } = buildDeps({
      findUnique: buildFiscalClassification({
        scoreService: 1,
        scoreTax: 1,
        scoreOrganization: 1,
        assessmentState: 'AI_SUGGESTED',
      }),
    });

    const result = await service.acceptSuggestion(
      'tenant-1',
      'classification-1',
      'user-42',
    );

    expect(result.classification.assessmentState).toBe('ASSESSED');
    expect(result.classification.assessedById).toBe('user-42');
    expect(result.classification.assessedAt).toBeInstanceOf(Date);
    expect(result.classification.complexityClass).toBe('C1');
  });

  it('aplica overrides do consultor por cima das notas da IA antes de calcular', async () => {
    const { service } = buildDeps({
      findUnique: buildFiscalClassification({
        scoreService: 1,
        scoreTax: 1,
        scoreOrganization: 1,
      }),
    });

    const result = await service.acceptSuggestion(
      'tenant-1',
      'classification-1',
      'user-42',
      { scoreOrganization: 3 },
    );

    // scoreVolume=2 + scoreService=1 + scoreTax=1 + scoreOrganization=3(override) = 7
    // → normalizedScore 37.5, no limite superior de C2 (classify(): <=37.5 → C2)
    expect(result.classification.complexityClass).toBe('C2');
    expect(result.classification.scoreOrganization).toBe(3);
  });

  it('rejeita a confirmação quando ainda falta algum critério (nem via override)', async () => {
    const { service } = buildDeps({
      findUnique: buildFiscalClassification({
        scoreService: 1,
        scoreTax: null,
        scoreOrganization: 1,
      }),
    });

    await expect(
      service.acceptSuggestion('tenant-1', 'classification-1', 'user-42'),
    ).rejects.toThrow(/faltam critérios/i);
  });
});
