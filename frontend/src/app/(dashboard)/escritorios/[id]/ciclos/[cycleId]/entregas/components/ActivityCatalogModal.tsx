'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Loader2,
  ListChecks,
  Layers,
  Workflow,
  CalendarClock,
  Minus
} from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { formatDeadlinePreview, currentCompetence } from '@/utils/deliveryDates';

const MODE_LABELS: Record<string, string> = {
  SIMPLE: 'Simples',
  CHECKLIST: 'Checklist',
  SUBTASKS: 'Sub-atividades'
};

const MODE_ICONS: Record<string, any> = {
  SIMPLE: Layers,
  CHECKLIST: ListChecks,
  SUBTASKS: Workflow
};

const emptyForm = {
  frontId: '',
  name: '',
  taxonomyNodeId: '',
  defaultEstimatedTimeMinutes: '',
  compositionMode: 'SIMPLE',
  status: 'ACTIVE',
  legalDeadlineDay: '',
  internalDeadlineOffsetDays: '',
  executionDeadlineOffsetDays: ''
};

const emptySubActivity = {
  name: '',
  taxonomyNodeId: '',
  defaultEstimatedTimeMinutes: '',
  legalDeadlineDay: '',
  internalDeadlineOffsetDays: '',
  executionDeadlineOffsetDays: ''
};

interface ActivityCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  isAdmin: boolean;
  onChanged?: () => void;
}

// Grid de dias (1-31) pra escolher o Vencimento — "dia do mês seguinte" é
// literalmente "clicar num dia", diferente dos outros dois campos da Regra
// de Prazos, que são durações ("N dias antes"), não datas marcáveis num
// calendário. Se não funcionar bem na prática, é só reverter este arquivo —
// nada fora daqui depende do jeito como esse campo é editado.
function DayOfMonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = value ? parseInt(value, 10) : null;
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 px-3 text-sm outline-none focus:border-teal-500 transition-all bg-white dark:bg-slate-900 flex items-center justify-between"
      >
        <span className={selected ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-400'}>
          {selected ? `Dia ${selected}` : 'Selecionar dia...'}
        </span>
        <CalendarClock className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-[15.5rem]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dia do mês seguinte à competência</p>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => {
                  onChange(String(day));
                  setOpen(false);
                }}
                className={`h-7 w-7 rounded-lg text-xs font-bold transition-colors ${
                  selected === day
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-500/10'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Stepper pra campos de duração ("N dias antes") — diferente do Vencimento,
// não são datas, então um calendário não se aplica aqui; mesma linguagem
// visual do stepper já usado em Configurações > Controle de Acessos.
function DaysOffsetStepper({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const numeric = value ? parseInt(value, 10) : 0;

  const change = (delta: number) => {
    onChange(String(Math.max(0, numeric + delta)));
  };

  return (
    <div className="flex items-center justify-between gap-1 h-10 px-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <button
        type="button"
        onClick={() => change(-1)}
        disabled={numeric <= 0}
        className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-teal-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="text-sm font-black text-slate-800 dark:text-slate-100 text-center truncate">
        {numeric} {numeric === 1 ? 'dia' : 'dias'}
      </span>
      <button
        type="button"
        onClick={() => change(1)}
        className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-teal-600 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Cadastro de Atividades do escritório (aponta pra Taxonomia global) — vivia
// numa aba própria em /escritorios/[id]/atividades; movido pra cá porque é a
// mesma preocupação de "que entregas este escritório gera todo mês" que
// Entregas Mensais já cobre, só que no nível de template em vez de instância.
export default function ActivityCatalogModal({ isOpen, onClose, tenantId, isAdmin, onChanged }: ActivityCatalogModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [activities, setActivities] = useState<any[]>([]);
  const [fronts, setFronts] = useState<any[]>([]);
  const [taxonomyNodes, setTaxonomyNodes] = useState<any[]>([]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [checklistItems, setChecklistItems] = useState<string[]>(['']);
  const [subActivities, setSubActivities] = useState<(typeof emptySubActivity)[]>([
    { ...emptySubActivity }
  ]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [a, f, t] = await Promise.all([
        apiRequest(`/activity-catalog?tenantId=${tenantId}`).catch(() => []),
        apiRequest(`/structures/fronts?tenantId=${tenantId}`).catch(() => []),
        apiRequest('/taxonomy/nodes').catch(() => [])
      ]);
      setActivities(a || []);
      setFronts(f || []);
      setTaxonomyNodes(t || []);
    } catch (err) {
      console.error('Erro ao buscar catálogo de atividades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchAll();
  }, [isOpen, tenantId]);

  const taxonomyById = useMemo(() => new Map(taxonomyNodes.map((n) => [n.id, n])), [taxonomyNodes]);

  const taxonomyOptions = useMemo(() => {
    return taxonomyNodes
      .filter((n) => n.status === 'ACTIVE')
      .map((n) => {
        const ancestorIds = (n.path || '/').split('/').filter(Boolean);
        const label = [...ancestorIds.map((aid: string) => taxonomyById.get(aid)?.name).filter(Boolean), n.name].join(' > ');
        return { id: n.id, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [taxonomyNodes, taxonomyById]);

  const breadcrumbForNode = (node: any) => {
    if (!node) return '—';
    const ancestorIds = (node.path || '/').split('/').filter(Boolean);
    return [...ancestorIds.map((aid: string) => taxonomyById.get(aid)?.name).filter(Boolean), node.name].join(' > ');
  };

  const filteredActivities = activities.filter(
    (a) =>
      a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fronts.find((f) => f.id === a.frontId)?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreate = () => {
    setSelectedActivity(null);
    setForm(emptyForm);
    setChecklistItems(['']);
    setSubActivities([{ ...emptySubActivity }]);
    setIsFormOpen(true);
  };

  const openEdit = (activity: any) => {
    setSelectedActivity(activity);
    setForm({
      frontId: activity.frontId || '',
      name: activity.name || '',
      taxonomyNodeId: activity.taxonomyNodeId || '',
      defaultEstimatedTimeMinutes: activity.defaultEstimatedTimeMinutes
        ? String(activity.defaultEstimatedTimeMinutes)
        : '',
      compositionMode: activity.compositionMode,
      status: activity.status,
      legalDeadlineDay: activity.legalDeadlineDay ? String(activity.legalDeadlineDay) : '',
      internalDeadlineOffsetDays: activity.internalDeadlineOffsetDays
        ? String(activity.internalDeadlineOffsetDays)
        : '',
      executionDeadlineOffsetDays: activity.executionDeadlineOffsetDays
        ? String(activity.executionDeadlineOffsetDays)
        : ''
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.frontId || !form.name.trim()) return;
    setSaving(true);
    try {
      if (selectedActivity) {
        await apiRequest(`/activity-catalog/${selectedActivity.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            tenantId,
            name: form.name,
            frontId: form.frontId,
            taxonomyNodeId: form.taxonomyNodeId || null,
            defaultEstimatedTimeMinutes: form.defaultEstimatedTimeMinutes || null,
            status: form.status,
            legalDeadlineDay: form.legalDeadlineDay || null,
            internalDeadlineOffsetDays: form.internalDeadlineOffsetDays || null,
            executionDeadlineOffsetDays: form.executionDeadlineOffsetDays || null
          })
        });
      } else {
        const body: Record<string, any> = {
          tenantId,
          frontId: form.frontId,
          name: form.name,
          taxonomyNodeId: form.taxonomyNodeId || null,
          compositionMode: form.compositionMode,
          defaultEstimatedTimeMinutes: form.defaultEstimatedTimeMinutes || null,
          legalDeadlineDay: form.legalDeadlineDay || null,
          internalDeadlineOffsetDays: form.internalDeadlineOffsetDays || null,
          executionDeadlineOffsetDays: form.executionDeadlineOffsetDays || null
        };
        if (form.compositionMode === 'CHECKLIST') {
          body.checklistTemplates = checklistItems
            .filter((i) => i.trim())
            .map((description, order) => ({ description, order }));
        }
        if (form.compositionMode === 'SUBTASKS') {
          body.subActivities = subActivities
            .filter((s) => s.name.trim())
            .map((s, order) => ({
              name: s.name,
              taxonomyNodeId: s.taxonomyNodeId || undefined,
              defaultEstimatedTimeMinutes: s.defaultEstimatedTimeMinutes || undefined,
              legalDeadlineDay: s.legalDeadlineDay || undefined,
              internalDeadlineOffsetDays: s.internalDeadlineOffsetDays || undefined,
              executionDeadlineOffsetDays: s.executionDeadlineOffsetDays || undefined,
              order
            }));
        }
        await apiRequest('/activity-catalog', { method: 'POST', body: JSON.stringify(body) });
      }
      setIsFormOpen(false);
      await fetchAll();
      onChanged?.();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar atividade.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (activityId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta atividade do catálogo? Entregas já criadas a partir dela não são afetadas.')) return;
    try {
      await apiRequest(`/activity-catalog/${activityId}?tenantId=${tenantId}`, { method: 'DELETE' });
      await fetchAll();
      onChanged?.();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir atividade.');
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
          className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-4xl shadow-2xl my-auto relative max-h-[90vh] flex flex-col overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start gap-6 shrink-0 bg-slate-50/50 dark:bg-slate-950/50">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Catálogo de Atividades</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-2xl">
                As atividades que este escritório realmente executa, cada uma apontando para uma classificação da
                Taxonomia global — usadas para preencher a Nova Entrega automaticamente e para gerar entregas em lote.
              </p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar atividade por nome ou frente..."
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm text-slate-900 dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {isAdmin && (
              <button
                onClick={openCreate}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 dark:bg-teal-600 text-white px-6 py-3 rounded-2xl hover:bg-teal-600 dark:hover:bg-teal-500 transition-all font-bold text-sm shadow-lg shrink-0"
              >
                <Plus className="w-4 h-4" />
                Nova Atividade
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-400 uppercase tracking-widest bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                <tr>
                  <th className="px-6 py-4 font-bold">Atividade</th>
                  <th className="px-6 py-4 font-bold">Frente</th>
                  <th className="px-6 py-4 font-bold">Classificação</th>
                  <th className="px-6 py-4 font-bold">Modo</th>
                  <th className="px-6 py-4 font-bold">Tempo Padrão</th>
                  <th className="px-6 py-4 text-right font-bold w-24">Ações</th>
                </tr>
              </thead>
              {loading ? (
                <tbody>
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <Loader2 className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-4" />
                    </td>
                  </tr>
                </tbody>
              ) : filteredActivities.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-lg mb-1">Nenhuma atividade cadastrada ainda</p>
                      <p className="text-sm font-medium text-slate-400">Crie a primeira atividade para começar a padronizar as entregas.</p>
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredActivities.map((activity) => {
                    const ModeIcon = MODE_ICONS[activity.compositionMode] || Layers;
                    return (
                      <tr key={activity.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900 dark:text-white">{activity.name}</p>
                          {activity.compositionMode === 'SUBTASKS' && activity.subActivities?.length > 0 && (
                            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                              Inclui: {activity.subActivities.map((s: any) => s.name).join(', ')}
                            </p>
                          )}
                          {activity.compositionMode === 'CHECKLIST' && activity.checklistTemplates?.length > 0 && (
                            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                              Checklist: {activity.checklistTemplates.length} {activity.checklistTemplates.length === 1 ? 'item' : 'itens'}
                            </p>
                          )}
                          {activity.status === 'INACTIVE' && (
                            <span className="inline-block mt-1 text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-md">
                              Inativa
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-semibold">
                          {fronts.find((f) => f.id === activity.frontId)?.name || '—'}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-xs">
                          {breadcrumbForNode(activity.taxonomyNode)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 rounded-lg text-[10px] font-black uppercase tracking-wider ring-1 ring-teal-500/20">
                            <ModeIcon className="w-3 h-3" /> {MODE_LABELS[activity.compositionMode] || activity.compositionMode}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-semibold">
                          {activity.defaultEstimatedTimeMinutes ? `${activity.defaultEstimatedTimeMinutes} min` : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isAdmin && (
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEdit(activity)}
                                className="p-2 text-slate-400 hover:text-teal-600 transition-colors rounded-xl hover:bg-teal-50 dark:hover:bg-teal-500/10"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(activity.id)}
                                className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>
          </div>
        </motion.div>

        <AnimatePresence>
          {isFormOpen && (
            <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 w-full max-w-2xl shadow-2xl my-auto relative"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {selectedActivity ? 'Editar Atividade' : 'Nova Atividade'}
                  </h2>
                  <button onClick={() => setIsFormOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Frente</label>
                      <select
                        required
                        value={form.frontId}
                        onChange={(e) => setForm({ ...form, frontId: e.target.value })}
                        className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-semibold outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                      >
                        <option value="">Selecione...</option>
                        {fronts.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nome da Atividade</label>
                      <input
                        required
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-medium outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                        placeholder="Ex: Apuração PIS"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Classificação (Taxonomia)</label>
                      <select
                        value={form.taxonomyNodeId}
                        onChange={(e) => setForm({ ...form, taxonomyNodeId: e.target.value })}
                        className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-medium outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                      >
                        <option value="">Sem classificação</option>
                        {taxonomyOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                      {taxonomyOptions.length === 0 && (
                        <p className="text-[10px] text-amber-600 mt-1 font-semibold">
                          Nenhuma categoria cadastrada. Peça a um Super Admin para popular a Taxonomia.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tempo Padrão (Minutos)</label>
                      <input
                        type="number"
                        min="0"
                        value={form.defaultEstimatedTimeMinutes}
                        onChange={(e) => setForm({ ...form, defaultEstimatedTimeMinutes: e.target.value })}
                        className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-medium outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                        placeholder="Ex: 120"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Regra de Prazos</label>
                    <p className="text-[10px] text-slate-400 font-semibold mb-3">
                      Obrigatória: sem ela não é possível criar entregas (manual ou em lote) a partir desta atividade.
                      As 3 datas se encadeiam: a Data Prevista vem antes do Prazo Interno, que vem antes do Vencimento.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">1. Vencimento — dia do mês seguinte</label>
                        <DayOfMonthPicker
                          value={form.legalDeadlineDay}
                          onChange={(v) => setForm({ ...form, legalDeadlineDay: v })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">2. Prazo Interno — dias antes do Vencimento</label>
                        <DaysOffsetStepper
                          value={form.internalDeadlineOffsetDays}
                          onChange={(v) => setForm({ ...form, internalDeadlineOffsetDays: v })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">3. Data Prevista — dias antes do Interno</label>
                        <DaysOffsetStepper
                          value={form.executionDeadlineOffsetDays}
                          onChange={(v) => setForm({ ...form, executionDeadlineOffsetDays: v })}
                        />
                      </div>
                    </div>

                    {/* Preview ao vivo: transforma os 3 números abstratos num exemplo concreto */}
                    <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-teal-50/60 dark:bg-teal-500/10 border border-teal-200/60 dark:border-teal-900/40">
                      <CalendarClock className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                      {form.legalDeadlineDay && form.internalDeadlineOffsetDays && form.executionDeadlineOffsetDays ? (
                        <p className="text-xs font-bold text-teal-800 dark:text-teal-300">
                          Exemplo pra uma entrega de {currentCompetence()}: {formatDeadlinePreview({
                            legalDeadlineDay: parseInt(form.legalDeadlineDay, 10),
                            internalDeadlineOffsetDays: parseInt(form.internalDeadlineOffsetDays, 10),
                            executionDeadlineOffsetDays: parseInt(form.executionDeadlineOffsetDays, 10)
                          })}
                        </p>
                      ) : (
                        <p className="text-xs font-semibold text-teal-700/70 dark:text-teal-400/70">
                          Preencha os 3 campos acima para ver um exemplo de como as datas ficam na prática.
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedActivity ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-semibold outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                      >
                        <option value="ACTIVE">Ativa</option>
                        <option value="INACTIVE">Inativa</option>
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                        Para mudar o modo (Simples/Checklist/Sub-atividades) ou reestruturar checklist/sub-atividades, exclua e recrie a atividade.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Modo de Composição</label>
                      <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl gap-1">
                        {(['SIMPLE', 'CHECKLIST', 'SUBTASKS'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setForm({ ...form, compositionMode: mode })}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                              form.compositionMode === mode
                                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                          >
                            {MODE_LABELS[mode]}
                          </button>
                        ))}
                      </div>

                      {form.compositionMode === 'CHECKLIST' && (
                        <div className="mt-4 space-y-2">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Itens do Checklist Padrão</label>
                          {checklistItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={item}
                                onChange={(e) => {
                                  const next = [...checklistItems];
                                  next[idx] = e.target.value;
                                  setChecklistItems(next);
                                }}
                                placeholder={`Item ${idx + 1}`}
                                className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-800 px-3 text-sm font-medium outline-none focus:border-teal-500 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => setChecklistItems(checklistItems.filter((_, i) => i !== idx))}
                                disabled={checklistItems.length === 1}
                                className="p-2 text-slate-400 hover:text-rose-500 disabled:opacity-30"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setChecklistItems([...checklistItems, ''])}
                            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 mt-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Adicionar item
                          </button>
                        </div>
                      )}

                      {form.compositionMode === 'SUBTASKS' && (
                        <div className="mt-4 space-y-3">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Sub-atividades</label>
                          {subActivities.map((sub, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={sub.name}
                                  onChange={(e) => {
                                    const next = [...subActivities];
                                    next[idx] = { ...next[idx], name: e.target.value };
                                    setSubActivities(next);
                                  }}
                                  placeholder={`Nome da sub-atividade ${idx + 1}`}
                                  className="flex-1 h-9 rounded-lg border border-slate-200 dark:border-slate-800 px-3 text-sm font-medium outline-none focus:border-teal-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => setSubActivities(subActivities.filter((_, i) => i !== idx))}
                                  disabled={subActivities.length === 1}
                                  className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={sub.taxonomyNodeId}
                                  onChange={(e) => {
                                    const next = [...subActivities];
                                    next[idx] = { ...next[idx], taxonomyNodeId: e.target.value };
                                    setSubActivities(next);
                                  }}
                                  className="h-9 rounded-lg border border-slate-200 dark:border-slate-800 px-2 text-xs font-medium outline-none focus:border-teal-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                >
                                  <option value="">Herdar classificação do pai</option>
                                  {taxonomyOptions.map((opt) => (
                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  min="0"
                                  value={sub.defaultEstimatedTimeMinutes}
                                  onChange={(e) => {
                                    const next = [...subActivities];
                                    next[idx] = { ...next[idx], defaultEstimatedTimeMinutes: e.target.value };
                                    setSubActivities(next);
                                  }}
                                  placeholder="Tempo (min)"
                                  className="h-9 rounded-lg border border-slate-200 dark:border-slate-800 px-3 text-xs font-medium outline-none focus:border-teal-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                />
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <DayOfMonthPicker
                                  value={sub.legalDeadlineDay}
                                  onChange={(v) => {
                                    const next = [...subActivities];
                                    next[idx] = { ...next[idx], legalDeadlineDay: v };
                                    setSubActivities(next);
                                  }}
                                />
                                <DaysOffsetStepper
                                  value={sub.internalDeadlineOffsetDays}
                                  onChange={(v) => {
                                    const next = [...subActivities];
                                    next[idx] = { ...next[idx], internalDeadlineOffsetDays: v };
                                    setSubActivities(next);
                                  }}
                                />
                                <DaysOffsetStepper
                                  value={sub.executionDeadlineOffsetDays}
                                  onChange={(v) => {
                                    const next = [...subActivities];
                                    next[idx] = { ...next[idx], executionDeadlineOffsetDays: v };
                                    setSubActivities(next);
                                  }}
                                />
                              </div>
                              {sub.legalDeadlineDay && sub.internalDeadlineOffsetDays && sub.executionDeadlineOffsetDays && (
                                <p className="text-[10px] font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                                  <CalendarClock className="w-3 h-3 shrink-0" />
                                  {formatDeadlinePreview({
                                    legalDeadlineDay: parseInt(sub.legalDeadlineDay, 10),
                                    internalDeadlineOffsetDays: parseInt(sub.internalDeadlineOffsetDays, 10),
                                    executionDeadlineOffsetDays: parseInt(sub.executionDeadlineOffsetDays, 10)
                                  })}
                                </p>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setSubActivities([...subActivities, { ...emptySubActivity }])}
                            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Adicionar sub-atividade
                          </button>
                          <p className="text-[10px] text-slate-400 font-semibold">
                            Cada sub-atividade vira sua própria Entrega quando esta atividade for usada na Nova Entrega — por isso cada uma precisa da sua própria Regra de Prazos (não herda do pai).
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onClick={() => setIsFormOpen(false)} className="px-5 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-3 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-2xl transition-colors flex items-center gap-2 shadow-lg shadow-teal-600/20 disabled:opacity-70"
                    >
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Salvar
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
