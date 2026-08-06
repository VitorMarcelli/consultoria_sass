'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/utils/api';

interface BulkGenerateFromCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  defaultCompetence: string;
  onGenerated: () => void;
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

  useEffect(() => {
    if (!isOpen) return;
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

  const handleSubmit = async () => {
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
    setSubmitting(true);
    try {
      const res = await apiRequest('/deliveries/bulk-from-catalog', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          frontId,
          competence,
          activityCatalogIds: Array.from(selectedActivityIds),
          clientIds: Array.from(selectedClientIds)
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
                Gerar Entregas pelo Catálogo
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-xl">
                Cria de uma vez uma Entrega para cada cliente ativo desta Frente x cada atividade do Catálogo escolhida.
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
            ) : (
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
            )}
          </div>

          <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="px-5 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || loadingOptions}
              className="px-6 py-3 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-2xl transition-colors flex items-center gap-2 shadow-lg shadow-teal-600/20 disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Gerar Entregas
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
