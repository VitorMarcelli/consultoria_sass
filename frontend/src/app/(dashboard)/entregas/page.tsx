'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { apiRequest } from '@/utils/api';

interface Delivery {
  id: string;
  competence: string;
  originalName: string;
  standardizedName: string;
  status: string;
  responsible: { name: string };
  front: { name: string };
  client: { name: string };
}

export default function EntregasPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [formData, setFormData] = useState({ clientId: '', frontId: '', responsibleId: '', competence: '', originalName: '', standardizedName: '', status: 'PREVISTA' });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [clients, setClients] = useState<any[]>([]);
  const [fronts, setFronts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const fetchDeliveries = async () => {
    try {
      const data = await apiRequest('/deliveries').catch(() => []);
      setDeliveries(data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const loadModalData = async () => {
    const [c, f, e] = await Promise.all([
      apiRequest('/clients').catch(() => []),
      apiRequest('/structures/fronts').catch(() => []),
      apiRequest('/employees').catch(() => [])
    ]);
    setClients(c);
    setFronts(f);
    setEmployees(e);
    return { clients: c, fronts: f, employees: e };
  };

  const handleOpenCreateModal = async () => {
    setSelectedDelivery(null);
    setIsModalOpen(true);
    try {
      const data = await loadModalData();
      setFormData({
        clientId: data.clients[0]?.id || '',
        frontId: data.fronts[0]?.id || '',
        responsibleId: data.employees[0]?.id || '',
        competence: '',
        originalName: '',
        standardizedName: '',
        status: 'PREVISTA'
      });
    } catch(err) {
      console.error(err);
    }
  };

  const handleOpenEditModal = async (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setIsModalOpen(true);
    try {
      await loadModalData();
      setFormData({
        clientId: (delivery as any).clientId || '',
        frontId: (delivery as any).frontId || '',
        responsibleId: (delivery as any).responsibleId || '',
        competence: delivery.competence,
        originalName: delivery.originalName,
        standardizedName: delivery.standardizedName,
        status: delivery.status
      });
    } catch(err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (selectedDelivery) {
        await apiRequest(`/deliveries/${selectedDelivery.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData)
        });
      } else {
        await apiRequest('/deliveries', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      setIsModalOpen(false);
      fetchDeliveries();
    } catch (err: unknown) {
      console.error(err);
      alert('Erro ao salvar entrega.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await apiRequest(`/deliveries/${id}`, { method: 'DELETE' });
      setDeleteConfirmId(null);
      fetchDeliveries();
    } catch (err: unknown) {
      console.error(err);
      alert('Erro ao excluir entrega.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <CheckSquare className="h-8 w-8 text-teal-500" />
            Entregas e Tempos
          </h1>
          <p className="text-slate-500 font-medium mt-1">Acompanhe obrigações, rotinas, responsáveis e revisão de tempos previstos.</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-xl hover:bg-slate-800 transition-all active:scale-95 duration-200 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nova Obrigação
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl my-auto"
            >
              <h2 className="text-xl font-bold text-slate-900 mb-4">{selectedDelivery ? 'Editar Entrega / Obrigação' : 'Nova Entrega / Obrigação'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Cliente</label>
                    <select required value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all bg-white">
                      <option value="">Selecione...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Competência</label>
                    <input required type="text" value={formData.competence} onChange={e => setFormData({...formData, competence: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all" placeholder="Ex: 05/2026" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Frente</label>
                    <select required value={formData.frontId} onChange={e => setFormData({...formData, frontId: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all bg-white">
                      <option value="">Selecione...</option>
                      {fronts.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Responsável (Equipe)</label>
                    <select required value={formData.responsibleId} onChange={e => setFormData({...formData, responsibleId: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all bg-white">
                      <option value="">Selecione...</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Padronizado (Macro)</label>
                    <input required type="text" value={formData.standardizedName} onChange={e => setFormData({...formData, standardizedName: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all" placeholder="Ex: Apuração PIS/COFINS" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all bg-white">
                      <option value="PREVISTA">Prevista</option>
                      <option value="ANDAMENTO">Em Andamento</option>
                      <option value="CONCLUIDA">Concluída</option>
                      <option value="INATIVA">Inativa</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Original (Detalhado)</label>
                  <input required type="text" value={formData.originalName} onChange={e => setFormData({...formData, originalName: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all" placeholder="Ex: Apuração PIS/COFINS Lucro Real" />
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                  <button type="submit" disabled={submitting} className="px-5 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors flex items-center gap-2">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
          <Loader2 className="h-10 w-10 text-teal-500 animate-spin" />
        </div>
      ) : deliveries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 mb-6 shadow-inner">
            <CheckSquare className="h-8 w-8 text-teal-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900">Nenhuma entrega mapeada</h3>
          <p className="text-slate-500 font-medium mt-2 max-w-sm">Faça o upload do template ou crie as primeiras rotinas para monitoramento.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 bg-white rounded-3xl shadow-sm">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-bold border-b border-slate-200">Competência</th>
                <th className="px-6 py-4 font-bold border-b border-slate-200">Cliente</th>
                <th className="px-6 py-4 font-bold border-b border-slate-200">Obrigação / Rotina</th>
                <th className="px-6 py-4 font-bold border-b border-slate-200">Frente</th>
                <th className="px-6 py-4 font-bold border-b border-slate-200">Responsável</th>
                <th className="px-6 py-4 font-bold border-b border-slate-200">Status</th>
                <th className="px-6 py-4 font-bold border-b border-slate-200 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deliveries.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-700">{delivery.competence}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{delivery.client?.name || '-'}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{delivery.standardizedName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{delivery.originalName}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{delivery.front?.name || '-'}</td>
                  <td className="px-6 py-4 font-medium text-slate-700">{delivery.responsible?.name || '-'}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                      {delivery.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {deleteConfirmId === delivery.id ? (
                        <div className="flex items-center gap-1 bg-teal-50 border border-teal-100 rounded-lg p-1">
                          <span className="text-xs font-bold text-teal-700 px-2">Excluir?</span>
                          <button onClick={() => handleDelete(delivery.id)} className="rounded bg-teal-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-teal-700 transition-colors">Sim</button>
                          <button onClick={() => setDeleteConfirmId(null)} className="rounded bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">Não</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => handleOpenEditModal(delivery)} className="text-slate-400 hover:text-slate-900 font-medium text-sm transition-colors mr-3">Editar</button>
                          <button onClick={() => setDeleteConfirmId(delivery.id)} className="text-slate-400 hover:text-teal-600 font-medium text-sm transition-colors">Excluir</button>
                        </>
                      )}
                    </div>
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
