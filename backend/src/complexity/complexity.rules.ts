// Funções puras do motor de complexidade — sem Prisma, sem injeção, sem I/O.
// O service (complexity.service.ts) orquestra; este arquivo só calcula.
// Ver docs/ORDEM-01-motor-complexidade.md, Bloco B, para o racional de negócio.

// Front aqui é uma classificação fixa interna ao motor (quais critérios se
// aplicam), NÃO o OperationalFront.name livre do tenant (esse mapeamento é
// responsabilidade de quem chama o service, fora do escopo desta ordem/bloco).
export type FrontType = 'FISCAL' | 'CONTABIL' | 'PESSOAL';

export type AssessmentState =
  | 'NOT_ASSESSED'
  | 'PARTIAL'
  | 'ASSESSED'
  | 'NOT_APPLICABLE'
  | 'IMPORTED'
  // Notas propostas pelo Agente de IA, pendentes de revisão do consultor.
  // Mesmo tratamento de IMPORTED em calculateCoefficients: fora do CCA/CCR
  // até virar ASSESSED (só isso confirma que um humano revisou o resultado).
  | 'AI_SUGGESTED';

export interface CriteriaScores {
  scoreVolume: number | null;
  scoreService: number | null;
  scoreTax: number | null; // null na frente Pessoal — não se aplica, ver scoreTurnover
  scoreOrganization: number | null;
  scoreTurnover: number | null; // Rotatividade — só se aplica na frente Pessoal, substitui Tributação
}

// Template MVP REV03 (07_Regras_Complexidade): as 3 frentes usam 4 critérios
// e a MESMA tabela de faixas (soma 4-5→C1 ... 12→C5). Pessoal não tem
// Tributação (não se aplica à folha) — no lugar entra Rotatividade.
const CRITERIA_BY_FRONT: Record<FrontType, (keyof CriteriaScores)[]> = {
  FISCAL: ['scoreVolume', 'scoreService', 'scoreTax', 'scoreOrganization'],
  CONTABIL: ['scoreVolume', 'scoreService', 'scoreTax', 'scoreOrganization'],
  PESSOAL: [
    'scoreVolume',
    'scoreService',
    'scoreOrganization',
    'scoreTurnover',
  ],
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Faixas idênticas para todas as frentes, aplicadas sobre normalizedScore
// (0..100). Ver seção B2 da ordem para a tabela e o porquê dos limites.
function classify(normalizedScore: number): string {
  if (normalizedScore <= 12.5) return 'C1';
  if (normalizedScore <= 37.5) return 'C2';
  if (normalizedScore <= 62.5) return 'C3';
  if (normalizedScore <= 87.5) return 'C4';
  return 'C5';
}

export interface EvaluateComplexityInput {
  front: FrontType;
  actsInFront: string; // ClientFrontClassification.actsInFront: YES, NO, NO_MOVEMENT
  clientStatus: string; // Client.status
  scores: CriteriaScores;
}

export interface EvaluateComplexityResult {
  rawSum: number | null;
  normalizedScore: number | null;
  complexityClass: string | null;
  assessmentState: AssessmentState;
}

// Ordem de decisão obrigatória (ver B2): (1) frente inativa/sem movimento →
// C0/NOT_APPLICABLE, (2) critério aplicável ausente → PARTIAL/NOT_ASSESSED
// (nunca vira C0, nunca assume nota 1), (3) tudo preenchido → calcula.
export function evaluateComplexity(
  input: EvaluateComplexityInput,
): EvaluateComplexityResult {
  const { front, actsInFront, clientStatus, scores } = input;

  if (actsInFront !== 'YES' || clientStatus !== 'ACTIVE') {
    return {
      rawSum: null,
      normalizedScore: null,
      complexityClass: 'C0',
      assessmentState: 'NOT_APPLICABLE',
    };
  }

  const applicableCriteria = CRITERIA_BY_FRONT[front];
  const values = applicableCriteria.map((key) => scores[key]);
  const filledValues = values.filter((v): v is number => v != null);

  if (filledValues.length < applicableCriteria.length) {
    return {
      rawSum: null,
      normalizedScore: null,
      complexityClass: null,
      assessmentState: filledValues.length > 0 ? 'PARTIAL' : 'NOT_ASSESSED',
    };
  }

  const rawSum = filledValues.reduce((a, b) => a + b, 0);
  const min = applicableCriteria.length * 1;
  const max = applicableCriteria.length * 3;
  const normalizedScore = round2(((rawSum - min) / (max - min)) * 100);

  return {
    rawSum,
    normalizedScore,
    complexityClass: classify(normalizedScore),
    assessmentState: 'ASSESSED',
  };
}

// ---------------------------------------------------------------------------
// B3: Nota de Volume (derivada, não perguntada)
// ---------------------------------------------------------------------------

// Faixas padrão por frente (ver B3) — constantes prontas para virar parâmetro
// configurável depois; não é intenção desta ordem.
const VOLUME_THRESHOLDS: Record<FrontType, { low: number; mid: number }> = {
  FISCAL: { low: 50, mid: 200 },
  CONTABIL: { low: 100, mid: 400 },
  PESSOAL: { low: 10, mid: 50 },
};

function scoreFromDriver(front: FrontType, value: number): number {
  const { low, mid } = VOLUME_THRESHOLDS[front];
  if (value <= low) return 1;
  if (value <= mid) return 2;
  return 3;
}

export interface VolumeInput {
  front: FrontType;
  // Driver numérico já resolvido pelo caller: monthlyNotesCount (Fiscal),
  // launchesCount (Contábil), employeesCount+prolaboreCount (Pessoal).
  driverValue: number | null;
  // Presente quando o usuário quer definir/sobrescrever a nota manualmente.
  manualOverride?: { score: number; reason?: string | null } | null;
}

export interface VolumeResult {
  scoreVolume: number | null;
  volumeSource: 'CALCULATED' | 'MANUAL' | null;
}

// Driver presente + sem override → CALCULATED. Driver ausente → aceita
// manual sem exigir justificativa. Driver presente + override manual → exige
// volumeOverrideReason não vazio (senão lança erro de validação).
export function calculateVolumeScore(input: VolumeInput): VolumeResult {
  const { front, driverValue, manualOverride } = input;

  if (manualOverride) {
    if (driverValue != null && !manualOverride.reason?.trim()) {
      throw new Error(
        'Nota de Volume manual exige justificativa (volumeOverrideReason) quando o driver numérico está disponível.',
      );
    }
    return { scoreVolume: manualOverride.score, volumeSource: 'MANUAL' };
  }

  if (driverValue == null) {
    return { scoreVolume: null, volumeSource: null };
  }

  return {
    scoreVolume: scoreFromDriver(front, driverValue),
    volumeSource: 'CALCULATED',
  };
}

// ---------------------------------------------------------------------------
// B4: CCA e CCR
// ---------------------------------------------------------------------------

export interface AssessmentRecord {
  assessmentState: AssessmentState;
  normalizedScore: number | null;
  primaryOwnerId: string | null;
}

export interface OwnerCoefficient {
  ownerId: string;
  ccr: number | null;
  distance: number | null;
  count: number;
}

export interface CoefficientResult {
  cca: number | null;
  assessedCount: number;
  totalActive: number;
  coveragePercent: number | null;
  byOwner: OwnerCoefficient[];
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return round2(values.reduce((a, b) => a + b, 0) / values.length);
}

// `records` deve conter só os registros da frente/ciclo em que o cliente
// realmente atua (quem chama já excluiu C0/NOT_APPLICABLE) — totalActive é
// simplesmente records.length. Universo do CCA/CCR (ver B4) é o subconjunto
// com assessmentState = 'ASSESSED' (C0, PARTIAL, NOT_ASSESSED e IMPORTED
// ficam fora do cálculo, mas contam para o denominador de cobertura).
export function calculateCoefficients(
  records: AssessmentRecord[],
): CoefficientResult {
  const totalActive = records.length;
  const assessed = records.filter(
    (r) => r.assessmentState === 'ASSESSED' && r.normalizedScore != null,
  );
  const assessedCount = assessed.length;

  const cca = average(assessed.map((r) => r.normalizedScore as number));
  const coveragePercent =
    totalActive > 0 ? round2((assessedCount / totalActive) * 100) : null;

  const ownerIds = [
    ...new Set(
      assessed
        .filter((r) => r.primaryOwnerId)
        .map((r) => r.primaryOwnerId as string),
    ),
  ];

  const byOwner: OwnerCoefficient[] = ownerIds.map((ownerId) => {
    const ownerRecords = assessed.filter((r) => r.primaryOwnerId === ownerId);
    const ccr = average(ownerRecords.map((r) => r.normalizedScore as number));
    return {
      ownerId,
      ccr,
      distance: cca != null && ccr != null ? round2(ccr - cca) : null,
      count: ownerRecords.length,
    };
  });

  return { cca, assessedCount, totalActive, coveragePercent, byOwner };
}
