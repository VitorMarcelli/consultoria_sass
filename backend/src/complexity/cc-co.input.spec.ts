import {
  buildFrontInput,
  isClientActive,
  resolveFront,
  resolveLinkCount,
} from './cc-co.input';

describe('resolveFront — nome livre do escritório para a frente do motor', () => {
  it('reconhece as variações usuais de cada frente', () => {
    expect(resolveFront('Fiscal')).toBe('FISCAL');
    expect(resolveFront('FISCAL / TRIBUTÁRIO')).toBe('FISCAL');
    expect(resolveFront('Contábil')).toBe('CONTABIL');
    expect(resolveFront('contabil')).toBe('CONTABIL');
    expect(resolveFront('Escrituração Contábil')).toBe('CONTABIL');
    expect(resolveFront('Pessoal')).toBe('PESSOAL');
    expect(resolveFront('Departamento Pessoal')).toBe('PESSOAL');
    expect(resolveFront('Folha de Pagamento')).toBe('PESSOAL');
  });

  it('casa "DP" como palavra inteira, não como pedaço de outra', () => {
    expect(resolveFront('DP')).toBe('PESSOAL');
    expect(resolveFront('Setor DP')).toBe('PESSOAL');
    // "Adpto" tem "dp" no meio e não pode virar Pessoal
    expect(resolveFront('Adpto')).toBeNull();
  });

  it('devolve null para frente que não casa — melhor que chutar', () => {
    expect(resolveFront('Consultoria')).toBeNull();
    expect(resolveFront('')).toBeNull();
    expect(resolveFront(null)).toBeNull();
  });
});

describe('isClientActive', () => {
  it('trata os códigos do template e os legados', () => {
    expect(isClientActive('ATIVO')).toBe(true);
    expect(isClientActive('ACTIVE')).toBe(true);
    expect(isClientActive('INATIVA')).toBe(false);
    expect(isClientActive('INACTIVE')).toBe(false);
    expect(isClientActive('SEM_MOVIMENTO')).toBe(false);
    expect(isClientActive('NO_MOVEMENT')).toBe(false);
  });

  it('sem status gravado, presume ativo (é o default do schema)', () => {
    expect(isClientActive(null)).toBe(true);
    expect(isClientActive(undefined)).toBe(true);
  });
});

describe('resolveLinkCount', () => {
  it('soma funcionários, pró-labores e domésticas', () => {
    expect(
      resolveLinkCount(
        { employeesCount: 10, prolaboreCount: 2, domesticsCount: 1 },
        {},
      ),
    ).toBe(13);
  });

  it('trata parcelas ausentes como zero, desde que exista alguma', () => {
    expect(resolveLinkCount({ employeesCount: 4 }, {})).toBe(4);
  });

  it('cai nas respostas do catálogo quando não há coluna preenchida', () => {
    expect(
      resolveLinkCount(null, {
        PESSOAL__QTD_FUNCIONARIOS: '7',
        PESSOAL__QTD_PRO_LABORES: '1',
      }),
    ).toBe(8);
  });

  it('a coluna tem precedência sobre a resposta solta', () => {
    expect(
      resolveLinkCount(
        { employeesCount: 20 },
        { PESSOAL__QTD_FUNCIONARIOS: '5' },
      ),
    ).toBe(20);
  });

  it('sem informação nenhuma devolve null, não zero', () => {
    // Zero significaria "cliente sem vínculo", que é outra afirmação.
    expect(resolveLinkCount(null, {})).toBeNull();
    expect(resolveLinkCount({}, {})).toBeNull();
  });
});

describe('buildFrontInput', () => {
  const client = {
    status: 'ACTIVE',
    profileType: 'EMPRESA_PJ',
    catalogAnswers: {
      MESTRE__REGIME_TRIBUTARIO: 'LUCRO_REAL',
      MESTRE__FAIXA_FATURAMENTO_ANUAL: 'R_4_8_20_MI',
    },
  };

  it('junta as respostas do MESTRE com as da frente', () => {
    const input = buildFrontInput('FISCAL', client, {
      actsInFront: 'YES',
      catalogAnswers: { FISCAL__NOTA_ATENDIMENTO: 'ALTO' },
    });
    expect(input.answers['MESTRE__REGIME_TRIBUTARIO']).toBe('LUCRO_REAL');
    expect(input.answers['FISCAL__NOTA_ATENDIMENTO']).toBe('ALTO');
    expect(input.active).toBe(true);
  });

  it('a coluna profileType tem precedência sobre a resposta solta', () => {
    const input = buildFrontInput(
      'FISCAL',
      {
        ...client,
        profileType: 'PRODUTOR_RURAL_PF',
        catalogAnswers: {
          ...client.catalogAnswers,
          MESTRE__PERFIL_DO_CLIENTE: 'PESSOA_FISICA',
        },
      },
      { actsInFront: 'YES' },
    );
    expect(input.answers['MESTRE__PERFIL_DO_CLIENTE']).toBe(
      'PRODUTOR_RURAL_PF',
    );
  });

  it('a resposta da frente sobrescreve a do MESTRE em caso de conflito', () => {
    const input = buildFrontInput('FISCAL', client, {
      actsInFront: 'YES',
      catalogAnswers: { MESTRE__REGIME_TRIBUTARIO: 'SIMPLES' },
    });
    expect(input.answers['MESTRE__REGIME_TRIBUTARIO']).toBe('SIMPLES');
  });

  it('frente não contratada fica inativa', () => {
    const input = buildFrontInput('FISCAL', client, { actsInFront: 'NO' });
    expect(input.active).toBe(false);
  });

  it('cliente sem movimento derruba a frente mesmo com actsInFront YES', () => {
    const input = buildFrontInput(
      'FISCAL',
      { ...client, status: 'SEM_MOVIMENTO' },
      { actsInFront: 'YES' },
    );
    expect(input.active).toBe(false);
  });

  it('só resolve Total de Vínculos na frente Pessoal', () => {
    const hrInfo = { employeesCount: 12 };
    expect(
      buildFrontInput('PESSOAL', client, { actsInFront: 'YES', hrInfo })
        .linkCount,
    ).toBe(12);
    expect(
      buildFrontInput('FISCAL', client, { actsInFront: 'YES', hrInfo })
        .linkCount,
    ).toBeNull();
  });

  it('sobrevive a catalogAnswers corrompido ou de tipo errado', () => {
    const input = buildFrontInput(
      'FISCAL',
      { status: 'ACTIVE', catalogAnswers: 'texto solto' as any },
      { actsInFront: 'YES', catalogAnswers: [1, 2, 3] as any },
    );
    expect(input.answers).toEqual({});
    expect(input.active).toBe(true);
  });
});
