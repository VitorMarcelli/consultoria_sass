'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Workflow
} from 'lucide-react';
import { apiRequest } from '@/utils/api';

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
  status: 'ACTIVE'
};

export default function AtividadesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [activities, setActivities] = useState<any[]>([]);
  const [fronts, setFronts] = useState<any[]>([]);
  const [taxonomyNodes, setTaxonomyNodes] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [checklistItems, setChecklistItems] = useState<string[]>(['']);
  const [subActivities, setSubActivities] = useState<
    { name: string; taxonomyNodeId: string; defaultEstimatedTimeMinutes: string }[]
  >([{ name: '', taxonomyNodeId: '', defaultEstimatedTimeMinutes: '' }]);

  const fetchAll = async () => {
    try {
      const [a, f, t] = await Promise.all([
        apiRequest(`/activity-catalog?tenantId=${id}`).catch(() => []),
        apiRequest(`/structures/fronts?tenantId=${id}`).catch(() => []),
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
    apiRequest('/users/me')
      .then((profile) => setIsAdmin(profile?.role === 'ADMIN'))
      .catch(() => setIsAdmin(false));
    fetchAll();
  }, [id]);

  const taxonomyById = useMemo(() => new Map(taxonomyNodes.map((n) => [n.id, n])), [taxonomyNodes]);

  // Opções do seletor de classificação: só nós ativos, com breadcrumb (ex: "Fiscal > Imposto > PIS"),
  // já que `path` só guarda ids ancestrais — precisa resolver os nomes via taxonomyById.
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
    setSubActivities([{ name: '', taxonomyNodeId: '', defaultEstimatedTimeMinutes: '' }]);
    setIsModalOpen(true);
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
      status: activity.status
    });
    setIsModalOpen(true);
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
            tenantId: id,
            name: form.name,
            frontId: form.frontId,
            taxonomyNodeId: form.taxonomyNodeId || null,
            defaultEstimatedTimeMinutes: form.defaultEstimatedTimeMinutes || null,
            status: form.status
          })
        });
      } else {
        const body: Record<string, any> = {
          tenantId: id,
          frontId: form.frontId,
          name: form.name,
          taxonomyNodeId: form.taxonomyNodeId || null,
          compositionMode: form.compositionMode,
          defaultEstimatedTimeMinutes: form.defaultEstimatedTimeMinutes || null
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
              order
            }));
        }
        await apiRequest('/activity-catalog', { method: 'POST', body: JSON.stringify(body) });
      }
      setIsModalOpen(false);
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar atividade.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (activityId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta atividade do catálogo? Entregas já criadas a partir dela não são afetadas.')) return;
    try {
      await apiRequest(`/activity-catalog/${activityId}?tenantId=${id}`, { method: 'DELETE' });
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir atividade.');
    }
  };

  return (
    <div className="relative pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
      >
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Cadastro de Atividades</h2>
          <p className="text-sm text-slate-500 font-medium mt-1 max-w-2xl">
            As atividades que este escritório realmente executa, cada uma apontando para uma classificação da
            Taxonomia global — é o que a Nova Entrega usa para preencher os dados automaticamente.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl hover:bg-teal-600 transition-all font-bold text-sm shadow-xl hover:shadow-teal-600/30 hover:-translate-y-0.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nova Atividade
          </button>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar atividade por nome ou frente..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-slate-400 uppercase tracking-widest bg-slate-50/80 border-b border-slate-200">
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
                    <p className="font-bold text-slate-700 text-lg mb-1">Nenhuma atividade cadastrada ainda</p>
                    <p className="text-sm font-medium text-slate-400">Crie a primeira atividade para começar a padronizar as entregas.</p>
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y divide-slate-100">
                {filteredActivities.map((activity) => {
                  const ModeIcon = MODE_ICONS[activity.compositionMode] || Layers;
                  return (
                    <tr key={activity.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{activity.name}</p>
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
                          <span className="inline-block mt-1 text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                            Inativa
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-semibold">
                        {fronts.find((f) => f.id === activity.frontId)?.name || '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium text-xs">
                        {breadcrumbForNode(activity.taxonomyNode)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg text-[10px] font-black uppercase tracking-wider ring-1 ring-teal-500/20">
                          <ModeIcon className="w-3 h-3" /> {MODE_LABELS[activity.compositionMode] || activity.compositionMode}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-semibold">
                        {activity.defaultEstimatedTimeMinutes ? `${activity.defaultEstimatedTimeMinutes} min` : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isAdmin && (
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(activity)}
                              className="p-2 text-slate-400 hover:text-teal-600 transition-colors rounded-xl hover:bg-teal-50"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(activity.id)}
                              className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-xl hover:bg-rose-50"
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
        {isModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] p-8 w-full max-w-2xl shadow-2xl my-auto relative"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-900">
                  {selectedActivity ? 'Editar Atividade' : 'Nova Atividade'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Frente</label>
                    <select
                      required
                      value={form.frontId}
                      onChange={(e) => setForm({ ...form, frontId: e.target.value })}
                      className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-teal-500 transition-all bg-slate-50"
                    >
                      <option value="">Selecione...</option>
                      {fronts.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nome da Atividade</label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm font-medium outline-none focus:border-teal-500 transition-all bg-slate-50"
                      placeholder="Ex: Apuração PIS"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Classificação (Taxonomia)</label>
                    <select
                      value={form.taxonomyNodeId}
                      onChange={(e) => setForm({ ...form, taxonomyNodeId: e.target.value })}
                      className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm font-medium outline-none focus:border-teal-500 transition-all bg-slate-50"
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tempo Padrão (Minutos)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.defaultEstimatedTimeMinutes}
                      onChange={(e) => setForm({ ...form, defaultEstimatedTimeMinutes: e.target.value })}
                      className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm font-medium outline-none focus:border-teal-500 transition-all bg-slate-50"
                      placeholder="Ex: 120"
                    />
                  </div>
                </div>

                {selectedActivity ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-teal-500 transition-all bg-slate-50"
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
                    <label className="block text-xs font-bold text-slate-700 mb-2">Modo de Composição</label>
                    <div className="flex p-1.5 bg-slate-100 rounded-2xl gap-1">
                      {(['SIMPLE', 'CHECKLIST', 'SUBTASKS'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setForm({ ...form, compositionMode: mode })}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            form.compositionMode === mode
                              ? 'bg-white text-teal-600 shadow-sm ring-1 ring-slate-200'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {MODE_LABELS[mode]}
                        </button>
                      ))}
                    </div>

                    {form.compositionMode === 'CHECKLIST' && (
                      <div className="mt-4 space-y-2">
                        <label className="block text-xs font-bold text-slate-700">Itens do Checklist Padrão</label>
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
                              className="flex-1 h-10 rounded-xl border border-slate-200 px-3 text-sm font-medium outline-none focus:border-teal-500 bg-slate-50"
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
                        <label className="block text-xs font-bold text-slate-700">Sub-atividades</label>
                        {subActivities.map((sub, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
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
                                className="flex-1 h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium outline-none focus:border-teal-500 bg-white"
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
                                className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-medium outline-none focus:border-teal-500 bg-white"
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
                                className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-medium outline-none focus:border-teal-500 bg-white"
                              />
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setSubActivities([...subActivities, { name: '', taxonomyNodeId: '', defaultEstimatedTimeMinutes: '' }])
                          }
                          className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar sub-atividade
                        </button>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          Cada sub-atividade vira sua própria Entrega (com prazo/responsável próprios) quando esta atividade for usada na Nova Entrega.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors">
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
  );
}
