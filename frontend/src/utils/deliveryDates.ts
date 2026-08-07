// Porta 1:1 de backend/src/deliveries/delivery-dates.rules.ts (mesma ordem
// de cálculo) — usado só pra mostrar um exemplo ao vivo no formulário de
// Regra de Prazos do Catálogo. O cálculo de verdade, na hora de criar a
// entrega, sempre acontece no backend; isso aqui é só preview.

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

// `competence` no formato "MM/YYYY". Vencimento Legal cai no mês SEGUINTE à
// competência — mesma âncora do backend.
export function computeActivityDeadlines(
  rule: ActivityDeadlineRule,
  competence: string
): ComputedActivityDeadlines {
  if (!rule.legalDeadlineDay) {
    return { legalDeadline: null, internalDeadline: null, executionDeadline: null };
  }

  const [compMonthStr, compYearStr] = competence.split('/');
  const compYear = Number(compYearStr);
  const compMonth = Number(compMonthStr) - 1; // 0-indexed
  const legalDeadline = new Date(compYear, compMonth + 1, rule.legalDeadlineDay);

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

// Competência do mês atual, no formato "MM/YYYY" — usada como exemplo no
// preview (não precisa ser exata, só ilustrativa).
export function currentCompetence(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${mm}/${now.getFullYear()}`;
}

function formatShort(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function formatDeadlinePreview(
  rule: ActivityDeadlineRule,
  competence: string = currentCompetence()
): string {
  const { legalDeadline, internalDeadline, executionDeadline } = computeActivityDeadlines(
    rule,
    competence
  );
  return `Vencimento ${formatShort(legalDeadline)} · Prazo Interno ${formatShort(internalDeadline)} · Data Prevista ${formatShort(executionDeadline)}`;
}
