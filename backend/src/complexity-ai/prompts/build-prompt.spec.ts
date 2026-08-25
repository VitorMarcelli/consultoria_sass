import { buildPrompt, ClientFrontContext } from './build-prompt';

function baseContext(overrides: Partial<ClientFrontContext>): ClientFrontContext {
  return {
    front: 'FISCAL',
    clientName: 'Empresa Exemplo Ltda.',
    taxRegime: null,
    segment: null,
    frequency: null,
    particulars: null,
    ...overrides,
  };
}

describe('buildPrompt', () => {
  it('Fiscal pede Atendimento, Tributação e Organização — nunca Volume nem Rotatividade', () => {
    const prompt = buildPrompt(baseContext({ front: 'FISCAL' }));
    expect(prompt).toContain('### Atendimento');
    expect(prompt).toContain('### Tributação');
    expect(prompt).toContain('### Organização');
    expect(prompt).not.toContain('### Rotatividade');
    expect(prompt).not.toContain('### Volume');
  });

  it('Pessoal pede Atendimento, Organização e Rotatividade — nunca Tributação', () => {
    const prompt = buildPrompt(baseContext({ front: 'PESSOAL' }));
    expect(prompt).toContain('### Atendimento');
    expect(prompt).toContain('### Organização');
    expect(prompt).toContain('### Rotatividade');
    expect(prompt).not.toContain('### Tributação');
  });

  it('omite campos nulos/ausentes e nunca inventa dado', () => {
    const prompt = buildPrompt(
      baseContext({ front: 'FISCAL', taxRegime: 'Simples Nacional' }),
    );
    expect(prompt).toContain('Regime tributário: Simples Nacional');
    expect(prompt).not.toContain('Segmento:');
  });

  it('sinaliza explicitamente quando não há nenhum dado objetivo disponível', () => {
    const prompt = buildPrompt(baseContext({ front: 'FISCAL' }));
    expect(prompt).toContain('(nenhum dado objetivo disponível)');
  });

  it('formata booleano como Sim/Não, não como true/false', () => {
    const prompt = buildPrompt(
      baseContext({ front: 'FISCAL', hasSpecialRegime: true }),
    );
    expect(prompt).toContain('Possui regime especial: Sim');
    expect(prompt).not.toContain('true');
  });

  it('instrui a não chutar nota quando faltar dado', () => {
    const prompt = buildPrompt(baseContext({ front: 'PESSOAL' }));
    expect(prompt).toMatch(/NUNCA invente ou "chute"/);
  });
});
