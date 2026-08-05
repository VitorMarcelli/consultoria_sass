import {
  evaluateComplexity,
  calculateVolumeScore,
  calculateCoefficients,
  AssessmentRecord,
} from './complexity.rules';

describe('evaluateComplexity', () => {
  it('CT-001: Fiscal, ativo, notas 1,1,1,1 → rawSum 4, score 0, C1, ASSESSED', () => {
    const result = evaluateComplexity({
      front: 'FISCAL',
      actsInFront: 'YES',
      clientStatus: 'ACTIVE',
      scores: {
        scoreVolume: 1,
        scoreService: 1,
        scoreTax: 1,
        scoreOrganization: 1,
      },
    });
    expect(result).toEqual({
      rawSum: 4,
      normalizedScore: 0,
      complexityClass: 'C1',
      assessmentState: 'ASSESSED',
    });
  });

  it('CT-002: Fiscal, ativo, notas 3,3,3,3 → rawSum 12, score 100, C5, ASSESSED', () => {
    const result = evaluateComplexity({
      front: 'FISCAL',
      actsInFront: 'YES',
      clientStatus: 'ACTIVE',
      scores: {
        scoreVolume: 3,
        scoreService: 3,
        scoreTax: 3,
        scoreOrganization: 3,
      },
    });
    expect(result).toEqual({
      rawSum: 12,
      normalizedScore: 100,
      complexityClass: 'C5',
      assessmentState: 'ASSESSED',
    });
  });

  it('CT-003: Contábil, status Inativo → C0, NOT_APPLICABLE, score null', () => {
    const result = evaluateComplexity({
      front: 'CONTABIL',
      actsInFront: 'YES',
      clientStatus: 'INACTIVE',
      scores: {
        scoreVolume: 2,
        scoreService: 2,
        scoreTax: 2,
        scoreOrganization: 2,
      },
    });
    expect(result).toEqual({
      rawSum: null,
      normalizedScore: null,
      complexityClass: 'C0',
      assessmentState: 'NOT_APPLICABLE',
    });
  });

  it('CT-004: Contábil, ativo, notas 2,2,null,2 → class null, PARTIAL — nunca C0', () => {
    const result = evaluateComplexity({
      front: 'CONTABIL',
      actsInFront: 'YES',
      clientStatus: 'ACTIVE',
      scores: {
        scoreVolume: 2,
        scoreService: 2,
        scoreTax: null,
        scoreOrganization: 2,
      },
    });
    expect(result.complexityClass).toBeNull();
    expect(result.assessmentState).toBe('PARTIAL');
    expect(result.assessmentState).not.toBe('NOT_APPLICABLE');
  });

  it('CT-005: Pessoal, ativo, notas 1,1,1 → rawSum 3, score 0, C1', () => {
    const result = evaluateComplexity({
      front: 'PESSOAL',
      actsInFront: 'YES',
      clientStatus: 'ACTIVE',
      scores: {
        scoreVolume: 1,
        scoreService: 1,
        scoreTax: null, // não se aplica em Pessoal
        scoreOrganization: 1,
      },
    });
    expect(result.rawSum).toBe(3);
    expect(result.normalizedScore).toBe(0);
    expect(result.complexityClass).toBe('C1');
    expect(result.assessmentState).toBe('ASSESSED');
  });

  it('CT-006: Pessoal, ativo, notas 3,3,3 → rawSum 9, score 100, C5', () => {
    const result = evaluateComplexity({
      front: 'PESSOAL',
      actsInFront: 'YES',
      clientStatus: 'ACTIVE',
      scores: {
        scoreVolume: 3,
        scoreService: 3,
        scoreTax: null,
        scoreOrganization: 3,
      },
    });
    expect(result.rawSum).toBe(9);
    expect(result.normalizedScore).toBe(100);
    expect(result.complexityClass).toBe('C5');
  });

  it('CT-011: Fiscal somas 4..12 reproduzem a tabela da seção B2 integralmente', () => {
    const cases: Array<[number, number, number, number, string]> = [
      [1, 1, 1, 1, 'C1'],
      [2, 1, 1, 1, 'C1'],
      [2, 2, 1, 1, 'C2'],
      [2, 2, 2, 1, 'C2'],
      [2, 2, 2, 2, 'C3'],
      [3, 2, 2, 2, 'C3'],
      [3, 3, 2, 2, 'C4'],
      [3, 3, 3, 2, 'C4'],
      [3, 3, 3, 3, 'C5'],
    ];
    for (const [volume, service, tax, organization, expectedClass] of cases) {
      const result = evaluateComplexity({
        front: 'FISCAL',
        actsInFront: 'YES',
        clientStatus: 'ACTIVE',
        scores: {
          scoreVolume: volume,
          scoreService: service,
          scoreTax: tax,
          scoreOrganization: organization,
        },
      });
      expect(result.complexityClass).toBe(expectedClass);
    }
  });

  it('CT-012: Fiscal 2,2,2,2 e Pessoal 2,2,2 produzem o mesmo normalizedScore (50)', () => {
    const fiscal = evaluateComplexity({
      front: 'FISCAL',
      actsInFront: 'YES',
      clientStatus: 'ACTIVE',
      scores: {
        scoreVolume: 2,
        scoreService: 2,
        scoreTax: 2,
        scoreOrganization: 2,
      },
    });
    const pessoal = evaluateComplexity({
      front: 'PESSOAL',
      actsInFront: 'YES',
      clientStatus: 'ACTIVE',
      scores: {
        scoreVolume: 2,
        scoreService: 2,
        scoreTax: null,
        scoreOrganization: 2,
      },
    });
    expect(fiscal.normalizedScore).toBe(50);
    expect(pessoal.normalizedScore).toBe(50);
    expect(fiscal.normalizedScore).toBe(pessoal.normalizedScore);
  });
});

describe('calculateCoefficients (CCA/CCR)', () => {
  it('CT-013: CCA com 1 registro ASSESSED e 3 pendentes → média só do ASSESSED; coveragePercent 25', () => {
    const records: AssessmentRecord[] = [
      { assessmentState: 'ASSESSED', normalizedScore: 70, primaryOwnerId: 'A' },
      {
        assessmentState: 'NOT_ASSESSED',
        normalizedScore: null,
        primaryOwnerId: null,
      },
      {
        assessmentState: 'NOT_ASSESSED',
        normalizedScore: null,
        primaryOwnerId: null,
      },
      {
        assessmentState: 'NOT_ASSESSED',
        normalizedScore: null,
        primaryOwnerId: null,
      },
    ];
    const result = calculateCoefficients(records);
    expect(result.cca).toBe(70);
    expect(result.assessedCount).toBe(1);
    expect(result.totalActive).toBe(4);
    expect(result.coveragePercent).toBe(25);
  });

  it('CT-014: responsável secundário nunca compõe o CCR (fora do contrato de entrada)', () => {
    // AssessmentRecord só carrega primaryOwnerId — um eventual "B" secundário
    // no dado de origem nunca chega até aqui, então nunca aparece em byOwner.
    const records: AssessmentRecord[] = [
      { assessmentState: 'ASSESSED', normalizedScore: 60, primaryOwnerId: 'A' },
      { assessmentState: 'ASSESSED', normalizedScore: 80, primaryOwnerId: 'A' },
    ];
    const result = calculateCoefficients(records);
    expect(result.byOwner).toHaveLength(1);
    expect(result.byOwner[0].ownerId).toBe('A');
    expect(result.byOwner[0].ccr).toBe(70);
    expect(result.byOwner.find((o) => o.ownerId === 'B')).toBeUndefined();
  });

  it('CT-015: universo vazio → CCA null, nunca 0', () => {
    const result = calculateCoefficients([]);
    expect(result.cca).toBeNull();
    expect(result.cca).not.toBe(0);
    expect(result.totalActive).toBe(0);
    expect(result.assessedCount).toBe(0);
  });
});

describe('calculateVolumeScore', () => {
  it('CT-016: driver 180 notas (Fiscal) → scoreVolume 2, volumeSource CALCULATED', () => {
    const result = calculateVolumeScore({ front: 'FISCAL', driverValue: 180 });
    expect(result).toEqual({ scoreVolume: 2, volumeSource: 'CALCULATED' });
  });

  it('CT-017: manual com driver presente e sem justificativa → erro de validação', () => {
    expect(() =>
      calculateVolumeScore({
        front: 'FISCAL',
        driverValue: 180,
        manualOverride: { score: 3, reason: '' },
      }),
    ).toThrow();
  });

  it('driver ausente aceita valor manual sem exigir justificativa', () => {
    const result = calculateVolumeScore({
      front: 'FISCAL',
      driverValue: null,
      manualOverride: { score: 2 },
    });
    expect(result).toEqual({ scoreVolume: 2, volumeSource: 'MANUAL' });
  });
});
