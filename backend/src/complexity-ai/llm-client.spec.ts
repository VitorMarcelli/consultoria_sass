import { ComplexityAiLlmClient } from './llm-client';
import { buildOutputSchema } from './prompts/build-prompt';

describe('ComplexityAiLlmClient — modo mock (COMPLEXITY_AI_MOCK)', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('isConfigured() é true com COMPLEXITY_AI_MOCK=true, mesmo sem ANTHROPIC_API_KEY', () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.COMPLEXITY_AI_MOCK = 'true';
    const client = new ComplexityAiLlmClient();
    expect(client.isConfigured()).toBe(true);
    expect(client.modelIdentifier).toBe('mock');
  });

  it('isConfigured() é false sem chave e sem modo mock', () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.COMPLEXITY_AI_MOCK;
    const client = new ComplexityAiLlmClient();
    expect(client.isConfigured()).toBe(false);
  });

  it('gera uma sugestão para cada critério do schema, sem chamar a API', async () => {
    process.env.COMPLEXITY_AI_MOCK = 'true';
    const client = new ComplexityAiLlmClient();
    const schema = buildOutputSchema('FISCAL');

    const result = await client.generateStructured('prompt de teste', schema);

    expect(result).not.toBeNull();
    expect(Object.keys(result)).toEqual(
      expect.arrayContaining(['scoreService', 'scoreTax', 'scoreOrganization']),
    );
    for (const key of Object.keys(result)) {
      expect([1, 2, 3]).toContain(result[key].score);
      expect(result[key].justification).toMatch(/modo mock/);
    }
  });

  it('é determinístico: mesmo prompt e schema sempre geram a mesma sugestão', async () => {
    process.env.COMPLEXITY_AI_MOCK = 'true';
    const client = new ComplexityAiLlmClient();
    const schema = buildOutputSchema('PESSOAL');

    const first = await client.generateStructured('Empresa Alfa Ltda.', schema);
    const second = await client.generateStructured('Empresa Alfa Ltda.', schema);

    expect(first).toEqual(second);
  });

  it('respeita os critérios por frente — Pessoal nunca inclui scoreTax', async () => {
    process.env.COMPLEXITY_AI_MOCK = 'true';
    const client = new ComplexityAiLlmClient();
    const schema = buildOutputSchema('PESSOAL');

    const result = await client.generateStructured('Empresa Beta Ltda.', schema);

    expect(result.scoreTurnover).toBeDefined();
    expect(result.scoreTax).toBeUndefined();
  });
});
