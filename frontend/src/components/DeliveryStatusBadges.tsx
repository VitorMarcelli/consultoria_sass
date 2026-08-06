'use client';

import {
  computeStatusObrigacao,
  computeStatusAgenda,
  STATUS_OBRIGACAO_META,
  STATUS_AGENDA_META,
  type DeliveryLifecycleDates
} from '@/utils/deliveryStatus';

interface DeliveryStatusBadgesProps {
  delivery: DeliveryLifecycleDates;
  size?: 'sm' | 'xs';
  className?: string;
}

// Selos de STATUS OBRIGAÇÃO + STATUS AGENDA — substitui em toda a UI o antigo
// badge único de Delivery.status. Recalculado a cada render (nunca cacheado),
// já que a regra é explicitamente "ao vivo": uma aba aberta durante a virada
// de um prazo precisa refletir isso no próximo render, não só no reload.
export default function DeliveryStatusBadges({ delivery, size = 'sm', className = '' }: DeliveryStatusBadgesProps) {
  const statusObrigacao = computeStatusObrigacao(delivery);
  const statusAgenda = computeStatusAgenda(delivery);
  const obrigacaoMeta = STATUS_OBRIGACAO_META[statusObrigacao];
  const agendaMeta = STATUS_AGENDA_META[statusAgenda];

  const padding = size === 'xs' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]';

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span
        title="Status Obrigação (Vencimento / Prazo Interno)"
        className={`inline-flex items-center rounded-md font-black uppercase tracking-wider ${padding} ${obrigacaoMeta.badgeClass}`}
      >
        {obrigacaoMeta.label}
      </span>
      <span
        title="Status Agenda (Data Prevista)"
        className={`inline-flex items-center rounded-md font-black uppercase tracking-wider ${padding} ${agendaMeta.badgeClass}`}
      >
        {agendaMeta.label}
      </span>
    </div>
  );
}
