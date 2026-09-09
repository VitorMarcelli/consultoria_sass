'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { apiRequest } from '@/utils/api';

interface Props {
  tenantId: string;
  frontId?: string;
  // Muda quando a carteira é recarregada, para o indicador acompanhar.
  refreshKey?: unknown;
}

// Quanto do mapeamento do M0 já foi feito, e quanto falta em respostas.
//
// Existe porque o índice só aparece quando a avaliação de uma frente fecha:
// sem esta contagem, o escritório vê uma sequência de "não avaliado" e não
// sabe se está a cinco ou a trezentas respostas do fim. É o número que diz
// se o M0 está entregue.
export default function MappingProgress({
  tenantId,
  frontId,
  refreshKey,
}: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const query = frontId
      ? `?tenantId=${tenantId}&frontId=${frontId}`
      : `?tenantId=${tenantId}`;
    apiRequest(`/cc-co/completeness${query}`)
      .then((r) => {
        if (alive) setData(r);
      })
      .catch((err) => {
        console.error('Falha ao carregar o progresso do mapeamento:', err);
        if (alive) setData(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tenantId, frontId, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
        <span className="text-sm font-medium text-slate-500">
          Calculando o progresso do mapeamento...
        </span>
      </div>
    );
  }

  if (!data || data.activeClients === 0) return null;

  const pct = data.completePercent ?? 0;
  const completo = data.complete === data.activeClients;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Mapeamento da carteira
            </p>
            <p className="mt-1 text-lg font-black text-slate-900">
              {data.complete} de {data.activeClients}{' '}
              <span className="text-sm font-bold text-slate-500">
                {data.activeClients === 1
                  ? 'cliente com avaliação completa'
                  : 'clientes com avaliação completa'}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p
              className={`text-2xl font-black ${completo ? 'text-teal-600' : 'text-amber-500'}`}
            >
              {pct}%
            </p>
            {data.missingAnswers > 0 && (
              <p className="text-[11px] font-bold text-slate-400">
                faltam {data.missingAnswers}{' '}
                {data.missingAnswers === 1 ? 'resposta' : 'respostas'}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 h-2 w-full rounded-full bg-slate-200/70">
          <div
            className={`h-2 rounded-full transition-all ${completo ? 'bg-teal-500' : 'bg-amber-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-semibold text-slate-500">
          {data.partial > 0 && <span>{data.partial} em andamento</span>}
          {data.notStarted > 0 && (
            <span className="text-amber-600">
              {data.notStarted} sem nenhuma resposta
            </span>
          )}
          {data.inactiveClients > 0 && (
            <span>
              {data.inactiveClients} sem frente ativa · fora da conta
            </span>
          )}
          {data.unmappedFronts > 0 && (
            <span className="text-rose-500">
              {data.unmappedFronts} frente(s) sem correspondência no cálculo
            </span>
          )}
        </div>

        {data.pending?.length > 0 && (
          <button
            type="button"
            onClick={() => setAberto(!aberto)}
            className="mt-3 flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-800"
          >
            {aberto ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {aberto ? 'Ocultar' : 'Ver por onde começar'}
          </button>
        )}
      </div>

      {aberto && data.pending?.length > 0 && (
        // Ordenado por quantidade de respostas faltando: quem está mais longe
        // de fechar aparece primeiro, porque é onde o esforço rende mais.
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-1.5 text-left font-bold">Cliente</th>
                <th className="py-1.5 text-right font-bold">Frentes</th>
                <th className="py-1.5 text-right font-bold">Faltam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {data.pending.map((p: any) => (
                <tr key={p.clientId}>
                  <td className="py-1.5 font-bold text-slate-700">
                    {p.clientName}
                  </td>
                  <td className="py-1.5 text-right font-semibold text-slate-500">
                    {p.frontsDone}/{p.frontsTotal}
                  </td>
                  <td className="py-1.5 text-right font-bold text-amber-600">
                    {p.missingAnswers}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
