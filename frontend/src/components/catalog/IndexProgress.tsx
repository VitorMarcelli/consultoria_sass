'use client';

import React from 'react';
import { CatalogField, ComplexityFront } from './useClientCatalog';

interface Props {
  front: ComplexityFront;
  masterFields: CatalogField[];
  frontFields: CatalogField[];
  answers: Record<string, string>;
}

// Conta quantas respostas que pontuam já foram dadas, por índice.
//
// De propósito NÃO calcula o valor de CC/CO aqui: o cálculo vive só no
// backend. Reimplementá-lo no frontend criaria duas versões da mesma regra,
// que é exatamente como o formulário antigo acabou divergindo da planilha.
// A tela mostra progresso; o número vem do servidor depois de salvar.
function count(
  fields: CatalogField[],
  answers: Record<string, string>,
  front: ComplexityFront,
  kind: 'cc' | 'co',
) {
  const relevant = fields.filter((f) => {
    if (!f.fronts.includes(front)) return false;
    if (kind === 'cc' && f.role !== 'CC' && f.role !== 'AMBOS') return false;
    if (kind === 'co' && f.role !== 'CO' && f.role !== 'AMBOS') return false;
    return true;
  });

  let answered = 0;
  let applicable = 0;
  for (const f of relevant) {
    const value = answers[f.key];
    const option = f.options?.find((o) => o.value === value);
    // "Não se aplica" sai da conta dos dois lados, igual ao motor.
    if (option?.notApplicable) continue;
    applicable += 1;
    if (value) answered += 1;
  }
  return { answered, applicable };
}

export default function IndexProgress({
  front,
  masterFields,
  frontFields,
  answers,
}: Props) {
  const all = [...masterFields, ...frontFields];
  const cc = count(all, answers, front, 'cc');
  const co = count(all, answers, front, 'co');

  const Item = ({
    label,
    data,
  }: {
    label: string;
    data: { answered: number; applicable: number };
  }) => {
    const done = data.applicable > 0 && data.answered === data.applicable;
    const pct = data.applicable > 0 ? (data.answered / data.applicable) * 100 : 0;
    return (
      <div className="flex-1">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            {label}
          </span>
          <span
            className={`text-[11px] font-bold ${done ? 'text-teal-600' : 'text-amber-600'}`}
          >
            {data.answered} de {data.applicable}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-200/70">
          <div
            className={`h-1.5 rounded-full transition-all ${done ? 'bg-teal-500' : 'bg-amber-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  const faltam =
    cc.applicable - cc.answered + (co.applicable - co.answered);

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
      <div className="flex gap-6">
        <Item label="Natureza do cliente" data={cc} />
        <Item label="Maturidade da operação" data={co} />
      </div>
      <p className="mt-3 text-[11px] font-medium text-slate-500">
        {faltam === 0
          ? 'Avaliação completa. O índice é calculado ao salvar.'
          : `Faltam ${faltam} ${faltam === 1 ? 'resposta' : 'respostas'} para o índice desta frente fechar.`}
      </p>
    </div>
  );
}
