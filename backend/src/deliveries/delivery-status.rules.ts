// Funções puras de classificação de status de Entrega — sem Prisma, sem
// injeção, sem I/O. Substitui o antigo campo único Delivery.status
// (PREVISTA/ANDAMENTO/ATRASADA/CONCLUIDA) por duas classificações computadas
// AO VIVO a partir das 4 datas que toda Delivery já tem. INATIVA (soft-delete,
// ver deliveries.service.ts remove()) é ortogonal a isso e não entra aqui.
//
// Cópia 1:1 (mesma ordem de branches) existe em frontend/src/utils/deliveryStatus.ts
// — qualquer mudança de regra precisa ser replicada nos dois lugares.

export type StatusObrigacao =
  | 'PEND'
  | 'OK_INTERNO'
  | 'OK_LEGAL'
  | 'OK_ATRASADO'
  | 'ATR_INTERNO'
  | 'ATR_VENCIMENTO';

export type StatusAgenda =
  | 'PEND'
  | 'OK_DENTRO_AGENDA'
  | 'OK_FORA_AGENDA'
  | 'ATR';

export interface DeliveryLifecycleDates {
  legalDeadline: Date | string | null;
  internalDeadline: Date | string | null;
  executionDeadline: Date | string | null;
  completedAt: Date | string | null;
  now?: Date; // injetável nos testes; default new Date()
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

// STATUS OBRIGAÇÃO: compara Vencimento/Prazo Interno com a Data de
// Entrega/Realização (ou "ainda não", contra agora). Dados legados sem
// alguma data só pulam aquele degrau da checagem — nunca lança exceção.
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
    // Sem Vencimento cadastrado (dado legado, ou removido manualmente depois
    // da criação) — sem um limite legal pra comparar, não há base pra
    // classificar como atrasado.
    return 'OK_INTERNO';
  }

  if (legal && now > legal) return 'ATR_VENCIMENTO';
  if (internal && now > internal) return 'ATR_INTERNO';
  return 'PEND';
}

// STATUS AGENDA: eixo independente, compara a Data Prevista (agenda do
// colaborador) com a Data de Entrega/Realização (ou "ainda não", contra
// agora). Não tem relação com Vencimento/Prazo Interno.
export function computeStatusAgenda(d: DeliveryLifecycleDates): StatusAgenda {
  const now = d.now ?? new Date();
  const exec = toDate(d.executionDeadline);
  const completedAt = toDate(d.completedAt);

  if (completedAt) {
    // Sem Data Prevista cadastrada — sem limite pra comparar, não há base
    // pra classificar como fora da agenda.
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
