// Porta 1:1 de backend/src/deliveries/delivery-status.rules.ts (mesma ordem
// de branches) — qualquer mudança de regra de negócio precisa ser replicada
// nos dois arquivos. Substitui o antigo Delivery.status
// (PREVISTA/ANDAMENTO/ATRASADA/CONCLUIDA) por duas classificações computadas
// AO VIVO a partir das 4 datas que toda Delivery já tem. INATIVA
// (soft-delete) é ortogonal a isso e não entra aqui.

export type StatusObrigacao =
  | 'PEND'
  | 'OK_INTERNO'
  | 'OK_LEGAL'
  | 'OK_ATRASADO'
  | 'ATR_INTERNO'
  | 'ATR_VENCIMENTO';

export type StatusAgenda = 'PEND' | 'OK_DENTRO_AGENDA' | 'OK_FORA_AGENDA' | 'ATR';

export interface DeliveryLifecycleDates {
  legalDeadline?: Date | string | null;
  internalDeadline?: Date | string | null;
  executionDeadline?: Date | string | null;
  completedAt?: Date | string | null;
  now?: Date; // injetável nos testes; default new Date()
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

export function computeStatusObrigacao(
  d: DeliveryLifecycleDates,
): StatusObrigacao {
  const now = d.now ?? new Date();
  const legal = toDate(d.legalDeadline);
  const internal = toDate(d.internalDeadline);
  const completedAt = toDate(d.completedAt);

  if (completedAt) {
    if (internal && completedAt <= internal) return 'OK_INTERNO';
    if (legal) return completedAt <= legal ? 'OK_LEGAL' : 'OK_ATRASADO';
    return 'OK_INTERNO';
  }

  if (legal && now > legal) return 'ATR_VENCIMENTO';
  if (internal && now > internal) return 'ATR_INTERNO';
  return 'PEND';
}

export function computeStatusAgenda(d: DeliveryLifecycleDates): StatusAgenda {
  const now = d.now ?? new Date();
  const exec = toDate(d.executionDeadline);
  const completedAt = toDate(d.completedAt);

  if (completedAt) {
    if (!exec) return 'OK_DENTRO_AGENDA';
    return completedAt <= exec ? 'OK_DENTRO_AGENDA' : 'OK_FORA_AGENDA';
  }

  if (exec && now > exec) return 'ATR';
  return 'PEND';
}

export function computeDeliveryStatus(d: DeliveryLifecycleDates): {
  statusObrigacao: StatusObrigacao;
  statusAgenda: StatusAgenda;
} {
  return {
    statusObrigacao: computeStatusObrigacao(d),
    statusAgenda: computeStatusAgenda(d),
  };
}

interface StatusMeta {
  label: string;
  badgeClass: string;
}

// Cores por severidade: slate = neutro/aguardando, emerald/teal = ok,
// amber = ok só no limite ou atraso leve, rose = atraso grave.
export const STATUS_OBRIGACAO_META: Record<StatusObrigacao, StatusMeta> = {
  PEND: { label: 'Pendente', badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  OK_INTERNO: { label: 'OK · Interno', badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  OK_LEGAL: { label: 'OK · Legal', badgeClass: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400' },
  OK_ATRASADO: { label: 'OK · Atrasado', badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  ATR_INTERNO: { label: 'Atrasado · Interno', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300' },
  ATR_VENCIMENTO: { label: 'Atrasado · Vencimento', badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' },
};

export const STATUS_AGENDA_META: Record<StatusAgenda, StatusMeta> = {
  PEND: { label: 'Pendente', badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  OK_DENTRO_AGENDA: { label: 'Dentro da Agenda', badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  OK_FORA_AGENDA: { label: 'Fora da Agenda', badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  ATR: { label: 'Atrasado', badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' },
};
