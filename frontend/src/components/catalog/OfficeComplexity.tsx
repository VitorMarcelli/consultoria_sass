'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, BarChart2 } from 'lucide-react';
import { apiRequest } from '@/utils/api';

interface Props {
  tenantId: string;
}

const NOME_FRENTE: Record<string, string> = {
  FISCAL: 'Fiscal',
  CONTABIL: 'Contábil',
  PESSOAL: 'Pessoal',
};

const fmt = (v: number | null | undefined) =>
  v == null ? '—' : v.toFixed(1).replace('.', ',');

// Complexidade Geral do escritório — o consolidado que faltava.
//
// O Diagnóstico mostra os índices por frente; este é o recorte que junta as
// três, que é a última linha da aba "Lógica da Complexidade" do template e o
// número que resume o projeto. Nos testes de 10/09 o cliente procurou por ele
// e não encontrou, porque o cálculo existia e nenhuma tela o exibia.
export default function OfficeComplexity({ tenantId }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    apiRequest(`/cc-co/portfolio?tenantId=${tenantId}`)
      .then((r) => {
        if (alive) setData(r);
      })
      .catch((err) => {
        console.error('Falha ao carregar a complexidade do escritório:', err);
        if (alive) setData(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-6 py-5">
        <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
        <span className="text-sm font-medium text-slate-500">
          Calculando a complexidade do escritório...
        </span>
      </div>
    );
  }

  if (!data) return null;

  const semAvaliacao = data.cc == null && data.co == null;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
        <BarChart2 className="h-4 w-4 text-slate-400" /> Complexidade Geral do
        Escritório
      </h3>
      <p className="mb-5 text-xs font-medium text-slate-500">
        {semAvaliacao
          ? 'Nenhum cliente com avaliação completa ainda.'
          : `Calculada sobre ${data.consideredCC} de ${data.activeCount} registros cliente-frente ativos.`}
        {data.pendingCount > 0 && (
          <>
            {' '}
            <span className="font-bold text-amber-600">
              {data.pendingCount} pendente{data.pendingCount === 1 ? '' : 's'}
            </span>
          </>
        )}
        {data.inactiveCount > 0 && <> · {data.inactiveCount} fora do cálculo</>}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Natureza do cliente
          </p>
          <p className="mt-1 text-3xl font-black text-slate-700">
            {fmt(data.cc)}
            {data.ccClass && (
              <span className="ml-2 text-xs font-bold text-slate-400">
                {data.ccClass}
              </span>
            )}
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-400">
            O que a carteira é. Não muda com o projeto.
          </p>
        </div>

        <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-teal-700">
            Maturidade da operação
          </p>
          <p className="mt-1 text-3xl font-black text-teal-700">
            {fmt(data.co)}
            {data.coClass && (
              <span className="ml-2 text-xs font-bold text-teal-500">
                {data.coClass}
              </span>
            )}
          </p>
          <p className="mt-1 text-[11px] font-medium text-teal-600/80">
            É o número que o projeto faz cair.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            CG Geral
          </p>
          <p className="mt-1 text-3xl font-black text-slate-900">
            {data.pair ?? '—'}
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-400">
            O par, não a média. Os dois não se somam.
          </p>
        </div>
      </div>

      {data.byFront?.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-2 text-left font-bold">Frente</th>
                <th className="py-2 text-right font-bold">Natureza</th>
                <th className="py-2 text-right font-bold">Maturidade</th>
                <th className="py-2 text-right font-bold">CG</th>
                <th className="py-2 text-right font-bold">Base</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.byFront.map((f: any) => (
                <tr key={f.frontId}>
                  <td className="py-2 font-bold text-slate-700">
                    {NOME_FRENTE[f.front] ?? f.frontName}
                  </td>
                  <td className="py-2 text-right font-semibold text-slate-600">
                    {fmt(f.cc)}
                  </td>
                  <td className="py-2 text-right font-semibold text-teal-700">
                    {fmt(f.co)}
                  </td>
                  <td className="py-2 text-right font-bold text-slate-800">
                    {f.pair ?? '—'}
                  </td>
                  <td className="py-2 text-right font-medium text-slate-400">
                    {f.consideredCC} de {f.activeCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] font-medium text-slate-400">
            O geral não é a média das frentes: ele reúne todas as observações
            cliente-frente num só conjunto. Com carteiras de tamanhos
            diferentes por frente, os dois resultados divergem — e é o conjunto
            que o template calcula.
          </p>
        </div>
      )}
    </div>
  );
}
