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
  const {
    loading: loadingCatalog,
    error: catalogError,
    fieldsOf,
  } = useClientCatalog();

  const [masterAnswers, setMasterAnswers] = useState<Record<string, string>>({});
  const [frontAnswers, setFrontAnswers] = useState<Record<string, string>>({});
  const [profileType, setProfileType] = useState<string>('');
  const [primaryOwnerId, setPrimaryOwnerId] = useState<string>('');
  const [secondaryOwnerId, setSecondaryOwnerId] = useState<string>('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Falha ao carregar é diferente de falha ao salvar: enquanto as respostas
  // não chegaram, o formulário está em branco, e salvar em branco apaga o que
  // já estava gravado. Por isso ela bloqueia o botão.
  const [loadError, setLoadError] = useState<string | null>(null);
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
    setLoadError(null);
    setResult(null);
    Promise.all([
      apiRequest(`/clients/${clientId}?tenantId=${tenantId}`),
      apiRequest(
        `/clients/${clientId}/fronts/${frontId}/classification?tenantId=${tenantId}`,
      ),
      apiRequest(`/employees?tenantId=${tenantId}`),
    ])
      .then(([cliente, classificacao, equipe]) => {
        if (!alive) return;
        const asMap = (v: any): Record<string, string> =>
          v && typeof v === 'object' && !Array.isArray(v) ? { ...v } : {};
        // As respostas do bloco MESTRE continuam sendo carregadas porque o
        // cálculo do CC depende delas — mas não são editáveis aqui.
        setMasterAnswers(asMap(cliente?.catalogAnswers));
        setFrontAnswers(asMap(classificacao?.catalogAnswers));
        setProfileType(cliente?.profileType ?? '');
        setPrimaryOwnerId(classificacao?.operator1Id ?? '');
        setSecondaryOwnerId(classificacao?.operator2Id ?? '');
        setEmployees(Array.isArray(equipe) ? equipe : []);
      })
      .catch((err) => {
        if (alive)
          setLoadError(err?.message || 'Falha ao carregar as respostas.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [clientId, frontId, tenantId]);

  const impedido = loadError || catalogError;

  const handleSave = async () => {
    if (impedido) return;
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
            // masterAnswers e profileType NÃO são enviados daqui: os dados
            // gerais do cliente se editam na visão geral. Mandá-los junto
            // faria a última frente salva sobrescrever o que outra tinha
            // gravado.
            frontAnswers,
            primaryOwnerId: primaryOwnerId || null,
            secondaryOwnerId: secondaryOwnerId || null,
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

      {/* Os dados gerais do cliente NÃO aparecem aqui. Eles valem para as três
          frentes, e deixá-los editáveis dentro de cada uma fazia o mesmo campo
          existir em três lugares — quem salvasse por último sobrescrevia os
          outros. Editam-se na visão geral do cliente. */}
      <div>
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-3">
          Responsáveis pela frente
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Responsável principal
            </label>
            <select
              value={primaryOwnerId}
              onChange={(e) => setPrimaryOwnerId(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            >
              <option value="">Selecione...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Responsável secundário
            </label>
            <select
              value={secondaryOwnerId}
              onChange={(e) => setSecondaryOwnerId(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            >
              <option value="">Nenhum</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-2 text-[11px] font-medium text-slate-400">
          O responsável principal é quem aparece no coeficiente por responsável
          do Diagnóstico.
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

      {impedido && (
        <p className="text-sm font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          Não foi possível carregar as respostas desta frente ({impedido}).
          Feche e abra a ficha de novo — salvar agora gravaria o formulário em
          branco por cima do que já está registrado.
        </p>
      )}

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
          disabled={saving || !!impedido}
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
