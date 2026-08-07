'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Sparkles, AlertTriangle, ChevronLeft, CalendarClock } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { computeActivityDeadlines, hasCompleteDeadlineRule, toDateInputValue } from '@/utils/deliveryDates';

interface BulkGenerateFromCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  defaultCompetence: string;
  onGenerated: () => void;
}

interface PreviewRow {
  key: string; // id da atividade (SIMPLE/CHECKLIST) ou da sub-atividade (SUBTASKS)
  label: string;
  hasRule: boolean;
  legalDeadline: string; // "YYYY-MM-DD", pro <input type="date">
  internalDeadline: string;
  executionDeadline: string;
}

// "Automático" pra Nova Entrega: em vez de criar uma entrega de cada vez,
// gera de uma vez uma Entrega por cliente x atividade ativa do catálogo
// daquela Frente — pensado pro início do ciclo, quando o volume de entregas
// recorrentes de uma Frente inteira precisa existir de uma vez só.
export default function BulkGenerateFromCatalogModal({
  isOpen,
  onClose,
  tenantId,
  defaultCompetence,
  onGenerated
}: BulkGenerateFromCatalogModalProps) {
  const [step, setStep] = useState<'SELECT' | 'PREVIEW'>('SELECT');
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fronts, setFronts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [classifications, setClassifications] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  const [frontId, setFrontId] = useState('');
  const [competence, setCompetence] = useState(defaultCompetence || '');
  const [selectedActivityIds, setSelectedActivityIds] = useState<Set<string>>(new Set());
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());

  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setStep('SELECT');
    setCompetence(defaultCompetence || '');
    setFrontId('');
    setActivities([]);
    setSelectedActivityIds(new Set());
    setSelectedClientIds(new Set());
    setLoadingOptions(true);
    Promise.all([
      apiRequest(`/structures/fronts?tenantId=${tenantId}`).catch(() => []),
      apiRequest(`/clients?tenantId=${tenantId}`).catch(() => []),
      apiRequest(`/client-classifications?tenantId=${tenantId}`).catch(() => [])
    ]).then(([f, c, cl]) => {
      setFronts(f || []);
      setClients(c || []);
      setClassifications(cl || []);
    }).finally(() => setLoadingOptions(false));
  }, [isOpen, tenantId, defaultCompetence]);

  useEffect(() => {
    if (!frontId) {
      setActivities([]);
      setSelectedActivityIds(new Set());
      return;
    }
    apiRequest(`/activity-catalog?tenantId=${tenantId}&frontId=${frontId}`)
      .then((res) => {
        const list = (res || []).filter((a: any) => a.status === 'ACTIVE');
        setActivities(list);
        setSelectedActivityIds(new Set(list.map((a: any) => a.id)));
      })
      .catch(() => setActivities([]));
  }, [frontId, tenantId]);

  // Clientes classificados como ACTIVE ("YES") nesta Frente — os únicos
  // elegíveis pra geração em lote, já com o responsável resolvido do mesmo
  // jeito que a criação manual/automática de entregas usa (líder > operador 1
  // > operador 2).
  const eligibleClients = useMemo(() => {
    if (!frontId) return [];
    return classifications
      .filter((c: any) => c.frontId === frontId && c.actsInFront === 'YES')
      .map((c: any) => {
        const client = clients.find((cl: any) => cl.id === c.clientId);
        const responsibleId = c.leaderId || c.operator1Id || c.operator2Id || null;
        return { clientId: c.clientId, name: client?.name || 'Cliente sem nome', responsibleId };
      })
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [frontId, classifications, clients]);

  useEffect(() => {
    setSelectedClientIds(new Set(eligibleClients.filter((c) => c.responsibleId).map((c) => c.clientId)));
  }, [eligibleClients]);

  const toggleActivity = (id: string) => {
    setSelectedActivityIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleClient = (id: string) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Uma linha por atividade (ou por sub-atividade, em modo Sub-atividades) —
  // não por cliente x atividade: a regra + competência são as mesmas pra
  // todo mundo selecionado, então a única variação real é por atividade. Se
  // um cliente específico precisar de data diferente dos demais, isso já dá
  // pra ajustar depois, editando aquela entrega pontual.
  const buildPreviewRows = (): PreviewRow[] => {
    const rows: PreviewRow[] = [];
    const selected = activities.filter((a) => selectedActivityIds.has(a.id));

    const pushRow = (key: string, label: string, rule: any) => {
      const complete = hasCompleteDeadlineRule(rule);
      const computed = complete
        ? computeActivityDeadlines(rule, competence)
        : { legalDeadline: null, internalDeadline: null, executionDeadline: null };
      rows.push({
        key,
        label,
        hasRule: complete,
        legalDeadline: toDateInputValue(computed.legalDeadline),
        internalDeadline: toDateInputValue(computed.internalDeadline),
        executionDeadline: toDateInputValue(computed.executionDeadline)
      });
    };

    for (const activity of selected) {
      if (activity.compositionMode === 'SUBTASKS' && activity.subActivities?.length) {
        for (const sub of activity.subActivities) {
          pushRow(sub.id, `${activity.name} > ${sub.name}`, sub);
        }
      } else {
        pushRow(activity.id, activity.name, activity);
      }
    }
    return rows;
  };

  const handleGoToPreview = () => {
    if (!frontId || !competence.trim()) {
      alert('Selecione a Frente e informe a Competência.');
      return;
    }
    if (selectedActivityIds.size === 0) {
      alert('Selecione ao menos uma atividade do catálogo.');
      return;
    }
    if (selectedClientIds.size === 0) {
      alert('Selecione ao menos um cliente.');
      return;
    }
    setPreviewRows(buildPreviewRows());
    setStep('PREVIEW');
  };

  const updatePreviewDate = (
    key: string,
    field: 'legalDeadline' | 'internalDeadline' | 'executionDeadline',
    value: string
  ) => {
    setPreviewRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      // Só manda override pra linhas com regra completa E com as 3 datas
      // preenchidas (se a pessoa apagar um campo, cai de volta pro cálculo
      // padrão da atividade no backend, em vez de mandar uma data quebrada).
      const dateOverrides: Record<string, { legalDeadline: string; internalDeadline: string; executionDeadline: string }> = {};
      for (const row of previewRows) {
        if (!row.hasRule || !row.legalDeadline || !row.internalDeadline || !row.executionDeadline) continue;
        dateOverrides[row.key] = {
          legalDeadline: `${row.legalDeadline}T12:00:00Z`,
          internalDeadline: `${row.internalDeadline}T12:00:00Z`,
          executionDeadline: `${row.executionDeadline}T12:00:00Z`
        };
      }

      const res = await apiRequest('/deliveries/bulk-from-catalog', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          frontId,
          competence,
          activityCatalogIds: Array.from(selectedActivityIds),
          clientIds: Array.from(selectedClientIds),
          dateOverrides
        })
      });
      const parts = [`${res.createdCount} entrega(s) criada(s)`];
      if (res.skippedExistingCount) parts.push(`${res.skippedExistingCount} já existiam e foram ignoradas`);
      if (res.skippedNoResponsibleClients?.length) {
        parts.push(`${res.skippedNoResponsibleClients.length} cliente(s) sem responsável configurado foram pulados (${res.skippedNoResponsibleClients.join(', ')})`);
      }
      if (res.skippedNoDeadlineRuleActivities?.length) {
        parts.push(`${res.skippedNoDeadlineRuleActivities.length} atividade(s) sem Regra de Prazos completa foram puladas (${res.skippedNoDeadlineRuleActivities.join(', ')}) — configure em "Gerenciar Catálogo"`);
      }
      alert(parts.join('. ') + '.');
      onGenerated();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar entregas em lote.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-2xl shadow-2xl my-auto relative max-h-[90vh] flex flex-col overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start gap-6 shrink-0 bg-slate-50/50 dark:bg-slate-950/50">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-500" />
                {step === 'SELECT' ? 'Gerar Entregas pelo Catálogo' : 'Revisar Datas Antes de Gerar'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-xl">
                {step === 'SELECT'
                  ? 'Cria de uma vez uma Entrega para cada cliente ativo desta Frente x cada atividade do Catálogo escolhida.'
                  : 'As datas abaixo vêm da Regra de Prazos de cada atividade. Ajuste aqui se este mês for diferente do padrão — vale pra todos os clientes selecionados.'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {loadingOptions ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
              </div>
            ) : step === 'SELECT' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Frente</label>
                    <select
                      value={frontId}
                      onChange={(e) => setFrontId(e.target.value)}
                      className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-semibold outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    >
                      <option value="">Selecione...</option>
                      {fronts.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Competência</label>
                    <input
                      type="text"
                      value={competence}
                      onChange={(e) => setCompetence(e.target.value)}
                      placeholder="Ex: 05/2026"
                      className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-medium outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {frontId && activities.length === 0 && (
                  <p className="text-sm font-semibold text-amber-600 bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl">
                    Nenhuma atividade ativa no Catálogo desta Frente. Use &quot;Gerenciar Catálogo&quot; para cadastrar antes de gerar em lote.
                  </p>
                )}

                {activities.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Atividades do Catálogo</label>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {activities.map((a) => (
                        <label key={a.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedActivityIds.has(a.id)}
                            onChange={() => toggleActivity(a.id)}
                            className="w-4 h-4 accent-teal-600"
                          />
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{a.name}</span>
                          {a.compositionMode === 'SUBTASKS' && (
                            <span className="text-[10px] font-bold text-slate-400">({a.subActivities?.length || 0} sub-atividades)</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {frontId && eligibleClients.length === 0 && (
                  <p className="text-sm font-semibold text-amber-600 bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl">
                    Nenhum cliente classificado como ativo nesta Frente.
                  </p>
                )}

                {eligibleClients.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Clientes ({selectedClientIds.size}/{eligibleClients.length})
                    </label>
                    <div className="space-y-1 max-h-52 overflow-y-auto pr-1 border border-slate-100 dark:border-slate-800 rounded-2xl p-2">
                      {eligibleClients.map((c) => (
                        <label key={c.clientId} className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedClientIds.has(c.clientId)}
                            onChange={() => toggleClient(c.clientId)}
                            disabled={!c.responsibleId}
                            className="w-4 h-4 accent-teal-600 disabled:opacity-40"
                          />
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex-1">{c.name}</span>
                          {!c.responsibleId && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                              <AlertTriangle className="w-3 h-3" /> Sem responsável
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {selectedClientIds.size} cliente(s) selecionado(s) vão receber estas datas pra cada atividade abaixo:
                </p>
                {previewRows.map((row) => (
                  <div
                    key={row.key}
                    className={`p-4 rounded-2xl border ${row.hasRule ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950' : 'border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-500/10'}`}
                  >
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-teal-500 shrink-0" />
                      {row.label}
                    </p>
                    {!row.hasRule ? (
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                        Sem Regra de Prazos configurada — esta atividade será pulada na geração.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vencimento</label>
                          <input
                            type="date"
                            value={row.legalDeadline}
                            onChange={(e) => updatePreviewDate(row.key, 'legalDeadline', e.target.value)}
                            className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 px-3 text-sm font-medium outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prazo Interno</label>
                          <input
                            type="date"
                            value={row.internalDeadline}
                            onChange={(e) => updatePreviewDate(row.key, 'internalDeadline', e.target.value)}
                            className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 px-3 text-sm font-medium outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Data Prevista</label>
                          <input
                            type="date"
                            value={row.executionDeadline}
                            onChange={(e) => updatePreviewDate(row.key, 'executionDeadline', e.target.value)}
                            className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 px-3 text-sm font-medium outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            {step === 'PREVIEW' ? (
              <button
                type="button"
                onClick={() => setStep('SELECT')}
                className="px-5 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            ) : (
              <button type="button" onClick={onClose} className="px-5 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">
                Cancelar
              </button>
            )}
            <button
              type="button"
              onClick={step === 'SELECT' ? handleGoToPreview : handleConfirm}
              disabled={submitting || loadingOptions}
              className="px-6 py-3 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-2xl transition-colors flex items-center gap-2 shadow-lg shadow-teal-600/20 disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {step === 'SELECT' ? 'Ver Prévia' : 'Confirmar e Gerar'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
