// Funções puras de resolução de prazos a partir da regra de uma atividade do
// Catálogo — sem Prisma, sem I/O. Usado por deliveries.service.ts na criação
// de entregas via Catálogo (manual e em lote), pra nunca mais nascer uma
// entrega sem Vencimento/Prazo Interno/Data Prevista.
//
// Encadeamento proposital (Data Prevista ← Prazo Interno ← Vencimento, cada
// uma "N dias antes da anterior"): garante por construção que
// executionDeadline <= internalDeadline <= legalDeadline, o que offsets
// independentes a partir do Vencimento não garantiriam.

export interface ActivityDeadlineRule {
  legalDeadlineDay: number | null; // dia do mês seguinte à competência (ex: 20)
  internalDeadlineOffsetDays: number | null; // dias ANTES do Vencimento
  executionDeadlineOffsetDays: number | null; // dias ANTES do Prazo Interno
}

export interface ComputedActivityDeadlines {
  legalDeadline: Date | null;
  internalDeadline: Date | null;
  executionDeadline: Date | null;
}

function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

// `competence` no formato "MM/YYYY" (mesma convenção usada em todo o
// restante do sistema). O Vencimento Legal cai no mês SEGUINTE à
// competência — mesma âncora que generateMonthlyDeliveries já usa pro
// DeliveryTemplate legado (deliveries.service.ts).
export function computeActivityDeadlines(
  rule: ActivityDeadlineRule,
  competence: string,
): ComputedActivityDeadlines {
  if (!rule.legalDeadlineDay) {
    return {
      legalDeadline: null,
      internalDeadline: null,
      executionDeadline: null,
    };
  }

  const [compMonthStr, compYearStr] = competence.split('/');
  const compYear = Number(compYearStr);
  const compMonth = Number(compMonthStr) - 1; // 0-indexed
  const legalDeadline = new Date(
    compYear,
    compMonth + 1,
    rule.legalDeadlineDay,
  );

  const internalDeadline =
    rule.internalDeadlineOffsetDays != null
      ? subtractDays(legalDeadline, rule.internalDeadlineOffsetDays)
      : null;

  const executionDeadline =
    internalDeadline && rule.executionDeadlineOffsetDays != null
      ? subtractDays(internalDeadline, rule.executionDeadlineOffsetDays)
      : null;

  return { legalDeadline, internalDeadline, executionDeadline };
}

// Regra completa = as 3 datas resolveriam sem nenhum null. Usado pra
// pré-filtrar atividades aptas na geração em lote sem duplicar a lógica de
// computeActivityDeadlines (nunca lança, só informa sim/não).
export function hasCompleteDeadlineRule(rule: ActivityDeadlineRule): boolean {
  return (
    rule.legalDeadlineDay != null &&
    rule.internalDeadlineOffsetDays != null &&
    rule.executionDeadlineOffsetDays != null
  );
}
