'use client';

import React from 'react';
import { CatalogField, isScoring, roleLabel } from './useClientCatalog';

interface Props {
  field: CatalogField;
  value: string;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
}

// Renderiza um campo do catálogo. É genérico de propósito: o template do
// cliente muda, o catálogo é regerado, e a tela acompanha sem alteração de
// código. Foi assim que o formulário antigo divergiu da planilha.
export default function CatalogFieldInput({
  field,
  value,
  onChange,
  disabled,
}: Props) {
  const scoring = isScoring(field);
  const role = roleLabel(field);

  const baseClasses =
    'w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-sm font-medium ' +
    'focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ' +
    'disabled:bg-slate-50 disabled:text-slate-400';

  return (
    <div>
      <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        <span>{field.label}</span>
        {scoring && (
          // Sinaliza que a resposta muda o índice. Sem isso, o consultor não
          // distingue campo cadastral de campo que reorganiza a agenda dele.
          <span
            title={role ?? undefined}
            className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[9px] font-black tracking-wide text-teal-700 normal-case"
          >
            {field.role === 'AMBOS' ? 'CC + CO' : field.role}
          </span>
        )}
      </label>

      {field.type === 'LISTA' && (
        <select
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={baseClasses}
        >
          <option value="">Selecione...</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* MASCARA cobre Data e Valor. Renderizar tudo como número fazia a
          competência do "Último Mês de Conciliação" virar um campo numérico —
          defeito reportado nos testes de 10/09/2026. */}
      {field.type === 'MASCARA' && field.format === 'DATA' && (
        <input
          type="month"
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={baseClasses}
        />
      )}

      {field.type === 'MASCARA' && field.format !== 'DATA' && (
        <input
          type="number"
          min={0}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={baseClasses}
          placeholder="0"
        />
      )}

      {field.type === 'TEXTO' && (
        <textarea
          rows={2}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={baseClasses + ' resize-none'}
          placeholder="Opcional"
        />
      )}

      {field.type === 'SWITCH' && (
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={value === 'true'}
            disabled={disabled}
            onChange={(e) =>
              onChange(field.key, e.target.checked ? 'true' : 'false')
            }
            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          Sim
        </label>
      )}
    </div>
  );
}
