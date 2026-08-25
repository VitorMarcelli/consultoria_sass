import { z } from 'zod';
import { FrontType } from '../../complexity/complexity.rules';
import { RUBRIC_BY_SCORE_KEY } from './rubrics';

// Critérios que a IA pode sugerir por frente. Volume nunca entra aqui — é
// sempre calculado pelo motor a partir de um driver numérico
// (complexity.rules.ts, calculateVolumeScore).
const AI_CRITERIA_BY_FRONT: Record<FrontType, (keyof typeof RUBRIC_BY_SCORE_KEY)[]> = {
  FISCAL: ['scoreService', 'scoreTax', 'scoreOrganization'],
  CONTABIL: ['scoreService', 'scoreTax', 'scoreOrganization'],
  PESSOAL: ['scoreService', 'scoreOrganization', 'scoreTurnover'],
};

// Schema de saída (structured output via Zod — client.messages.parse). O
// shape varia por frente porque os critérios aplicáveis variam (ver
// AI_CRITERIA_BY_FRONT); "score: null" é uma resposta válida e esperada
// quando falta dado — nunca um erro de parsing.
const criterionSchema = z.object({
  score: z.union([z.literal(1), z.literal(2), z.literal(3), z.null()]),
  justification: z.string(),
});

export type CriterionSuggestion = z.infer<typeof criterionSchema>;

export function buildOutputSchema(front: FrontType) {
  const criteria = AI_CRITERIA_BY_FRONT[front];
  const shape: Record<string, typeof criterionSchema> = {};
  for (const key of criteria) {
    shape[key] = criterionSchema;
  }
  return z.object(shape);
}

// Dados de entrada disponíveis para montar o prompt. Todos opcionais porque
// nem todo campo se aplica a toda frente (ver comentários por bloco) — campos
// ausentes simplesmente não aparecem no prompt, nunca são inventados.
export interface ClientFrontContext {
  front: FrontType;
  clientName: string;
  taxRegime: string | null;
  segment: string | null;
  frequency: string | null; // "Frequência de atendimento" (ClientFrontClassification.frequency) — driver de Atendimento
  particulars: string | null;

  // Fiscal (ClientTaxInfo)
  hasSpecialRegime?: boolean | null;
  specialRegimeDescription?: string | null;
  automationLevel?: string | null;
  meetsDeadlines?: string | null;
  documentReceiptMethod?: string | null;
  documentSendMethod?: string | null;
  integrationMethod?: string | null;

  // Contábil (ClientAccountingInfo)
  bookkeepingRegime?: string | null;
  lastClosingMonth?: string | null;
  lastReconciliationMonth?: string | null;
  closingPeriod?: string | null;
  infoReceiptFrequency?: string | null;
  integrationLevel?: string | null;
  trialBalanceNeed?: string | null;

  // Pessoal (ClientHrInfo)
  employeesCount?: number | null;
  prolaboreCount?: number | null;
  domesticsCount?: number | null;
  pointReceiptMethod?: string | null;
  variablesLaunchMethod?: string | null;
  processingType?: string | null;
  sheetSendingMethod?: string | null;
  frequentAdmissions?: boolean | null;
}

function formatRubric(key: keyof typeof RUBRIC_BY_SCORE_KEY): string {
  const rubric = RUBRIC_BY_SCORE_KEY[key];
  return [
    `### ${rubric.label}`,
    rubric.definition,
    `1 (Baixo): ${rubric.levels[1]}`,
    `2 (Médio): ${rubric.levels[2]}`,
    `3 (Alto): ${rubric.levels[3]}`,
  ].join('\n');
}

function formatField(label: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return `- ${label}: ${value ? 'Sim' : 'Não'}`;
  return `- ${label}: ${value}`;
}

export function buildPrompt(context: ClientFrontContext): string {
  const criteria = AI_CRITERIA_BY_FRONT[context.front];

  const dataLines = [
    formatField('Regime tributário', context.taxRegime),
    formatField('Segmento', context.segment),
    formatField('Frequência de atendimento informada', context.frequency),
    formatField('Particularidades registradas', context.particulars),
    formatField('Possui regime especial', context.hasSpecialRegime),
    formatField('Descrição do regime especial', context.specialRegimeDescription),
    formatField('Nível de automação da apuração', context.automationLevel),
    formatField('Cumpre prazos de envio', context.meetsDeadlines),
    formatField('Forma de recebimento de documentos', context.documentReceiptMethod),
    formatField('Forma de envio de documentos', context.documentSendMethod),
    formatField('Forma de integração', context.integrationMethod),
    formatField('Regime de escrituração', context.bookkeepingRegime),
    formatField('Último mês de fechamento', context.lastClosingMonth),
    formatField('Último mês de conciliação', context.lastReconciliationMonth),
    formatField('Período de fechamento', context.closingPeriod),
    formatField(
      'Frequência de recebimento de informação financeira',
      context.infoReceiptFrequency,
    ),
    formatField('Nível de integração com o cliente', context.integrationLevel),
    formatField('Necessidade de apresentação de balancete', context.trialBalanceNeed),
    formatField('Quantidade de funcionários', context.employeesCount),
    formatField('Quantidade de pró-labores', context.prolaboreCount),
    formatField('Quantidade de domésticas', context.domesticsCount),
    formatField('Forma de recebimento de ponto', context.pointReceiptMethod),
    formatField('Meio de lançamento de variáveis', context.variablesLaunchMethod),
    formatField('Tipo de processamento', context.processingType),
    formatField('Forma de envio da folha', context.sheetSendingMethod),
    formatField('Admissões e rescisões frequentes', context.frequentAdmissions),
  ].filter((line): line is string => line !== null);

  // O formato da resposta (JSON estrito por critério) é garantido pelo
  // structured output do SDK (output_config.format, ver llm-client.ts) — o
  // prompt só precisa das regras de conteúdo, nunca de instruções de sintaxe.
  return `
Você é um analista de operações de escritórios de contabilidade. Sua tarefa é sugerir notas de complexidade (1 a 3) para o cliente "${context.clientName}" na frente ${context.front}, com base SOMENTE nos dados objetivos fornecidos abaixo.

Critérios a avaliar, com suas rubricas oficiais:

${criteria.map(formatRubric).join('\n\n')}

Dados disponíveis do cliente nesta frente:
${dataLines.length > 0 ? dataLines.join('\n') : '(nenhum dado objetivo disponível)'}

Regras obrigatórias:
- Se não houver dado suficiente para avaliar um critério com confiança, responda "score": null e explique o motivo na "justification" — NUNCA invente ou "chute" uma nota sem base nos dados fornecidos.
- Baseie a nota exclusivamente nos dados acima e nas rubricas — não presuma informações que não foram dadas.
`.trim();
}
