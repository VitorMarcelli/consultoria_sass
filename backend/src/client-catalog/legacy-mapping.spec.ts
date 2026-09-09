import {
  bandForAnnual,
  mapByLabel,
  mapProfileType,
  mapRevenueBracket,
  mapSegment,
  mapStatus,
  mapTaxRegime,
} from './legacy-mapping';

describe('mapTaxRegime', () => {
  it('mapeia os valores que existem na base', () => {
    // Contagens reais levantadas em 09/09/2026.
    expect(mapTaxRegime('Simples Nacional')).toEqual({
      status: 'MAPEADO',
      code: 'SIMPLES',
    });
    expect(mapTaxRegime('SIMPLES_NACIONAL')).toEqual({
      status: 'MAPEADO',
      code: 'SIMPLES',
    });
    expect(mapTaxRegime('Lucro Presumido')).toEqual({
      status: 'MAPEADO',
      code: 'LUCRO_PRESUMIDO',
    });
    expect(mapTaxRegime('LUCRO_PRESUMIDO')).toEqual({
      status: 'MAPEADO',
      code: 'LUCRO_PRESUMIDO',
    });
    expect(mapTaxRegime('Lucro Real')).toEqual({
      status: 'MAPEADO',
      code: 'LUCRO_REAL',
    });
  });

  it('MEI não vira Simples em silêncio', () => {
    // O template não tem opção para MEI. Escolher Simples por conta própria
    // gravaria uma nota de complexidade que ninguém decidiu.
    const r = mapTaxRegime('MEI');
    expect(r.status).toBe('AMBIGUO');
  });

  it('vazio é vazio, desconhecido é desconhecido', () => {
    expect(mapTaxRegime('').status).toBe('VAZIO');
    expect(mapTaxRegime(null).status).toBe('VAZIO');
    expect(mapTaxRegime('Lucro Arbitrado').status).toBe('DESCONHECIDO');
  });
});

describe('mapSegment', () => {
  it('expande os rótulos curtos da base para as categorias do template', () => {
    const casos: [string, string][] = [
      ['Tecnologia', 'TECNOLOGIA_E_COMUNICACAO'],
      ['Comércio', 'COMERCIO_E_DISTRIBUICAO'],
      ['Varejo', 'COMERCIO_E_DISTRIBUICAO'],
      ['Indústria', 'INDUSTRIA'],
      ['Construção', 'CONSTRUCAO_E_MERCADO_IMOBILIARIO'],
      ['Saúde', 'SAUDE_E_BEM_ESTAR'],
      ['Logística', 'TRANSPORTE_E_LOGISTICA'],
      ['Agro', 'AGRONEGOCIO'],
      ['Educação', 'EDUCACAO'],
      ['Alimentação', 'ALIMENTACAO_HOTELARIA_E_TURISMO'],
      ['Serviços', 'SERVICOS_EMPRESARIAIS_E_PROFISSIONAIS'],
    ];
    for (const [entrada, esperado] of casos) {
      expect(mapSegment(entrada)).toEqual({
        status: 'MAPEADO',
        code: esperado,
      });
    }
  });

  it('termo curto casa como palavra inteira, e casa de verdade', () => {
    // Dois lados da mesma moeda. "logistica" contém "ti" e não pode virar
    // Tecnologia; mas "TI" sozinho precisa continuar casando. A primeira
    // tentativa de correção usou fronteira de palavra dentro de template
    // literal, onde a sequência vira backspace — o primeiro caso passava e o
    // segundo silenciosamente parava de funcionar.
    expect(mapSegment('Logística')).toEqual({
      status: 'MAPEADO',
      code: 'TRANSPORTE_E_LOGISTICA',
    });
    expect(mapSegment('TI')).toEqual({
      status: 'MAPEADO',
      code: 'TECNOLOGIA_E_COMUNICACAO',
    });
    expect(mapSegment('Consultoria em TI')).toEqual({
      status: 'MAPEADO',
      code: 'TECNOLOGIA_E_COMUNICACAO',
    });
  });

  it('"Serviços" não sequestra segmentos mais específicos', () => {
    // "Serviço" é o termo mais genérico e é testado por último de propósito.
    expect(mapSegment('Serviços de Tecnologia')).toEqual({
      status: 'MAPEADO',
      code: 'TECNOLOGIA_E_COMUNICACAO',
    });
    expect(mapSegment('Serviços de Saúde')).toEqual({
      status: 'MAPEADO',
      code: 'SAUDE_E_BEM_ESTAR',
    });
  });

  it('cai em Outros quando não reconhece — não pontua, então é seguro', () => {
    expect(mapSegment('Xyz')).toEqual({ status: 'MAPEADO', code: 'OUTROS' });
  });
});

describe('mapRevenueBracket — o mapeamento de maior risco', () => {
  it('converte faixa mensal quando ela cabe inteira numa faixa anual', () => {
    // 700 mil a 1,5 mi por mês = 8,4 a 18 mi por ano, dentro de "R$ 4,8-20 mi"
    expect(mapRevenueBracket('R$ 700 mil a R$ 1,5 mi/mês')).toEqual({
      status: 'MAPEADO',
      code: 'R_4_8_20_MI',
    });
    // 100 a 300 mil por mês = 1,2 a 3,6 mi por ano, dentro de "R$ 1,2-4,8 mi"
    expect(mapRevenueBracket('R$ 100 mil a R$ 300 mil/mês')).toEqual({
      status: 'MAPEADO',
      code: 'R_1_2_4_8_MI',
    });
  });

  it('recusa a faixa mensal que atravessa duas faixas anuais', () => {
    // Até 100 mil/mês vai de 0 a 1,2 mi/ano e cruza "Até R$ 360 mil" e
    // "R$ 360 mil-1,2 mi". Escolher um dos dois seria inventar a nota.
    const r = mapRevenueBracket('Até R$ 100 mil/mês');
    expect(r.status).toBe('AMBIGUO');
    if (r.status === 'AMBIGUO') {
      expect(r.candidates).toEqual(['ATE_R_360_MIL', 'R_360_MIL_1_2_MI']);
    }

    // 300 a 700 mil/mês = 3,6 a 8,4 mi/ano, cruza duas faixas
    expect(mapRevenueBracket('R$ 300 mil a R$ 700 mil/mês').status).toBe(
      'AMBIGUO',
    );
    expect(mapRevenueBracket('Acima de R$ 1,5 mi/mês').status).toBe('AMBIGUO');
  });

  it('número solto é ambíguo: falta a unidade', () => {
    const r = mapRevenueBracket('90000');
    expect(r.status).toBe('AMBIGUO');
    if (r.status === 'AMBIGUO') {
      // 90 mil no ano cai numa faixa; 90 mil por mês cai em outra.
      expect(r.candidates).toEqual(['ATE_R_360_MIL', 'R_360_MIL_1_2_MI']);
    }
  });

  it('aceita valor já no formato do template', () => {
    expect(mapRevenueBracket('R$ 1,2–4,8 mi')).toEqual({
      status: 'MAPEADO',
      code: 'R_1_2_4_8_MI',
    });
    expect(mapRevenueBracket('R$ 360 mil–1,2 mi')).toEqual({
      status: 'MAPEADO',
      code: 'R_360_MIL_1_2_MI',
    });
  });

  it('lixo digitado vira desconhecido, não vira faixa', () => {
    expect(mapRevenueBracket('dfrsss').status).toBe('DESCONHECIDO');
  });

  it('bandForAnnual respeita os limites do template', () => {
    expect(bandForAnnual(360_000)).toBe('ATE_R_360_MIL');
    expect(bandForAnnual(360_001)).toBe('R_360_MIL_1_2_MI');
    expect(bandForAnnual(4_800_000)).toBe('R_1_2_4_8_MI');
    expect(bandForAnnual(80_000_000)).toBe('ACIMA_DE_R_78_MI');
  });
});

describe('mapStatus', () => {
  it('cobre as quatro grafias que existem na base', () => {
    expect(mapStatus('ACTIVE')).toEqual({ status: 'MAPEADO', code: 'ATIVO' });
    expect(mapStatus('Ativo')).toEqual({ status: 'MAPEADO', code: 'ATIVO' });
    expect(mapStatus('INACTIVE')).toEqual({
      status: 'MAPEADO',
      code: 'INATIVA',
    });
    expect(mapStatus('Inativo')).toEqual({ status: 'MAPEADO', code: 'INATIVA' });
  });

  it('reconhece Sem Movimento, que ainda não aparece na base', () => {
    expect(mapStatus('Sem Movimento')).toEqual({
      status: 'MAPEADO',
      code: 'SEM_MOVIMENTO',
    });
  });
});

describe('mapProfileType', () => {
  it('usa personType quando existe', () => {
    expect(mapProfileType('PJ')).toEqual({
      status: 'MAPEADO',
      code: 'EMPRESA_PJ',
    });
    expect(mapProfileType('PF_DOMESTICA')).toEqual({
      status: 'MAPEADO',
      code: 'EMPREGADOR_DOMESTICO',
    });
  });

  it('CNPJ é conclusivo para PJ', () => {
    expect(mapProfileType(null, '12345678000199')).toEqual({
      status: 'MAPEADO',
      code: 'EMPRESA_PJ',
    });
  });

  it('CPF não é conclusivo — três perfis usam CPF e têm notas diferentes', () => {
    const r = mapProfileType(null, '12345678901');
    expect(r.status).toBe('AMBIGUO');
    if (r.status === 'AMBIGUO') expect(r.candidates).toHaveLength(3);
  });

  it('sem informação nenhuma devolve vazio', () => {
    expect(mapProfileType(null, null).status).toBe('VAZIO');
  });
});

describe('mapByLabel — campos operacionais das frentes', () => {
  const options = [
    { value: 'PLATAFORMA_INTEGRADA', label: 'Plataforma integrada' },
    { value: 'PORTAL', label: 'Portal' },
    { value: 'E_MAIL', label: 'E-mail' },
    { value: 'MANUAL_FISICO', label: 'Manual/Físico' },
  ];

  it('casa pelo rótulo do template, que é como já foi gravado', () => {
    expect(mapByLabel('Portal', options)).toEqual({
      status: 'MAPEADO',
      code: 'PORTAL',
    });
    expect(mapByLabel('E-mail', options)).toEqual({
      status: 'MAPEADO',
      code: 'E_MAIL',
    });
    expect(mapByLabel('Manual/Físico', options)).toEqual({
      status: 'MAPEADO',
      code: 'MANUAL_FISICO',
    });
  });

  it('ignora acento e caixa', () => {
    expect(mapByLabel('manual/fisico', options).status).toBe('MAPEADO');
  });

  it('opção fora da lista não é forçada', () => {
    expect(mapByLabel('Pombo-correio', options).status).toBe('DESCONHECIDO');
  });
});
