'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import {
  useClientCatalog,
  isRenderableField,
  CatalogField,
  ComplexityFront,
} from './useClientCatalog';
import CatalogFieldInput from './CatalogFieldInput';
import IndexProgress from './IndexProgress';

interface Props {
  tenantId: string;
  clientId: string;
  frontId: string;
  frontName: string;
  front: ComplexityFront;
  onSaved?: () => void;
}

// Edição das respostas de uma frente já cadastrada.
//
// É a tela do uso recorrente do produto, não do cadastro inicial: quando o
// escritório troca o recebimento por WhatsApp por um portal, é aqui que a
// mudança é registrada e a Maturidade da Operação cai. Sem ela dá para
// cadastrar mas não para provar evolução, que é o que o projeto vende.
export default function FrontCatalogEditor({
  tenantId,
  clientId,
  frontId,
  frontName,
  front,
  onSaved,
}: Props) {
  const { loading: loadingCatalog, fieldsOf } = useClientCatalog();

  const [masterAnswers, setMasterAnswers] = useState<Record<string, string>>({});
  const [frontAnswers, setFrontAnswers] = useState<Record<string, string>>({});
  const [profileType, setProfileType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const masterFields = useMemo(
    () => fieldsOf('MESTRE').filter(isRenderableField),
    [loadingCatalog],
  );
  const frontFields = useMemo(
    () => fieldsOf(front).filter(isRenderableField),
    [loadingCatalog, front],
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setResult(null);
    Promise.all([
      apiRequest(`/clients/${clientId}?tenantId=${tenantId}`),
      apiRequest(
        `/clients/${clientId}/fronts/${frontId}/classification?tenantId=${tenantId}`,
      ),
    ])
      .then(([cliente, classificacao]) => {
        if (!alive) return;
        const asMap = (v: any): Record<string, string> =>
          v && typeof v === 'object' && !Array.isArray(v) ? { ...v } : {};
        setMasterAnswers(asMap(cliente?.catalogAnswers));
        setFrontAnswers(asMap(classificacao?.catalogAnswers));
        setProfileType(cliente?.profileType ?? '');
      })
      .catch((err) => {
        if (alive) setError(err?.message || 'Falha ao carregar as respostas.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [clientId, frontId, tenantId]);

  const setMaster = (key: string, value: string) => {
    setMasterAnswers((prev) => ({ ...prev, [key]: value }));
    if (key === 'MESTRE__PERFIL_DO_CLIENTE') setProfileType(value);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // O backend calcula e devolve o índice já recalculado. A tela nunca
      // envia o índice — só as respostas.
      const r = await apiRequest(
        `/cc-co/clients/${clientId}/fronts/${frontId}/answers`,
        {
          method: 'POST',
          body: JSON.stringify({
            tenantId,
            profileType: profileType || null,
            masterAnswers,
            frontAnswers,
          }),
        },
      );
      setResult(r);
      if (onSaved) onSaved();
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar as respostas.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingCatalog || loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  const fmt = (v: number | null | undefined) =>
    v == null ? '—' : v.toFixed(1).replace('.', ',');

  return (
    <div className="space-y-5">
      <IndexProgress
        front={front}
        masterFields={masterFields}
        frontFields={frontFields}
        answers={{ ...masterAnswers, ...frontAnswers }}
      />

      <div>
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-3">
          Dados gerais do cliente
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {masterFields.map((f: CatalogField) => (
            <CatalogFieldInput
              key={f.key}
              field={f}
              value={masterAnswers[f.key] ?? ''}
              onChange={setMaster}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] font-medium text-slate-400">
          Estes campos valem para todas as frentes do cliente.
        </p>
      </div>

      <div>
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-3">
          Operação da frente {frontName}
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {frontFields.map((f: CatalogField) => (
            <CatalogFieldInput
              key={f.key}
              field={f}
              value={frontAnswers[f.key] ?? ''}
              onChange={(key, value) =>
                setFrontAnswers((prev) => ({ ...prev, [key]: value }))
              }
            />
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {result && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/70 px-4 py-3">
          <p className="text-sm font-black text-teal-800 flex items-center gap-2">
            <Check className="w-4 h-4" /> Respostas salvas e índice recalculado
          </p>
          <p className="text-sm font-bold text-teal-700 mt-1">
            Natureza {fmt(result?.cc?.value)}
            {result?.cc?.class ? ` (${result.cc.class})` : ''} · Maturidade{' '}
            {fmt(result?.co?.value)}
            {result?.co?.class ? ` (${result.co.class})` : ''}
          </p>
          {(result?.cc?.state === 'PARTIAL' ||
            result?.co?.state === 'PARTIAL') && (
            <p className="text-[11px] font-medium text-teal-700/80 mt-1">
              O índice só fecha quando todas as respostas aplicáveis estiverem
              preenchidas.
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Salvar e recalcular'
          )}
        </button>
      </div>
    </div>
  );
}
