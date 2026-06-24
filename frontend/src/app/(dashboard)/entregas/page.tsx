'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  Sparkles,
  Filter,
  Layers
} from 'lucide-react';
import { apiRequest } from '@/utils/api';
import DeliverySlideOver from '@/components/DeliverySlideOver';

interface Delivery {
  id: string;
  competence: string;
  originalName: string;
  standardizedName: string;
  status: string;
  responsible: { name: string };
  front: { name: string };
  client: { name: string };
  clientId?: string;
  frontId?: string;
  responsibleId?: string;
}

export default function EntregasPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingMonthly, setGeneratingMonthly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // SlideOver 360º
  const [slideOverDelivery, setSlideOverDelivery] = useState<any | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

  // Modal CRUD
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
        competence: new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
        originalName: '',
        standardizedName: '',
        status: 'PREVISTA'
      });
    } catch(err) {
      console.error(err);
    }
  };

  const handleOpenEditModal = async (delivery: Delivery, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDelivery(delivery);
    setIsModalOpen(true);
    try {
      await loadModalData();
      setFormData({
        clientId: delivery.clientId || '',
        frontId: delivery.frontId || '',
        responsibleId: delivery.responsibleId || '',
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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  // Dispara a geracao automatica de matriz de conformidade
  const handleGenerateMonthly = async () => {
    setGeneratingMonthly(true);
    try {
      const activeTenant = localStorage.getItem('sevilha_active_tenant_id') || '';
      const res = await apiRequest(`/deliveries/generate-monthly`, {
        method: 'POST',
        body: JSON.stringify({ tenantId: activeTenant })
      });
      alert(`Matriz de Conformidade executada! ${res.generatedCount} novas entregas geradas a partir dos templates ativos para a competência ${res.competence}.`);
      fetchDeliveries();
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar entregas mensais.');
    } finally {
      setGeneratingMonthly(false);
    }
  };

  const openSlideOver360 = (delivery: Delivery) => {
    // Mapeamento para o formato do DeliverySlideOver
    let statusMapped = 'PENDING';
    if (delivery.status === 'CONCLUIDA') statusMapped = 'COMPLETED';
    if (delivery.status === 'INATIVA' || delivery.status === 'LATE') statusMapped = 'LATE';

    setSlideOverDelivery({
      id: delivery.id,
      name: delivery.standardizedName || delivery.originalName,
      client: delivery.client?.name || 'Cliente Não Informado',
      deadline: `Competência ${delivery.competence}`,
      responsible: delivery.responsible?.name || 'Não atribuído',
      status: statusMapped,
      raw: delivery
    });
    setIsSlideOverOpen(true);
  };

  // Filtragem
  const filteredDeliveries = deliveries.filter(d => {
    const matchQuery = (d.standardizedName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                       (d.originalName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                       (d.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'ALL') return matchQuery;
    return matchQuery && d.status === statusFilter;
  });

  // Estatisticas para o painel de conformidade
  const totalCount = deliveries.length;
  const completedCount = deliveries.filter(d => d.status === 'CONCLUIDA').length;
  const pendingCount = deliveries.filter(d => d.status === 'PREVISTA' || d.status === 'ANDAMENTO').length;
  const complianceRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <CheckSquare className="h-8 w-8 text-teal-500" />
            Entregas & Conformidade TASS
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Motor de Matriz de Conformidade Automática, monitoramento de rotinas e Slide-overs 360º.
          </p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerateMonthly}
            disabled={generatingMonthly}
            className="flex items-center justify-center gap-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white px-5 py-3.5 text-sm font-extrabold shadow-lg shadow-teal-600/20 transition-all disabled:opacity-50"
          >
            {generatingMonthly ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Executar Matriz Automática
          </motion.button>

          <button 
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 dark:bg-slate-100 text-white dark:text-slate-950 px-5 py-3.5 text-sm font-extrabold shadow-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-all active:scale-95 duration-200"
          >
            <Plus className="h-4 w-4" />
            Nova Obrigação
          </button>
        </div>
      </div>

      {/* Painel de Matriz de Conformidade (Dashboard Extra Premium) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden border border-slate-700/50">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-teal-500/10 to-transparent pointer-events-none blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="flex flex-col gap-2 max-w-xl">
            <span className="text-[10px] font-black text-teal-400 uppercase tracking-[0.2em] bg-teal-500/10 px-3 py-1 rounded-full w-max border border-teal-500/20">
              Índice Geral de Conformidade
            </span>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-white">
              {complianceRate}% das obrigações no prazo
            </h2>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              O motor automático avalia e cria rotinas atreladas a frentes e responsáveis. Acompanhe os comprovantes de entrega pelo painel 360º.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-4 w-full lg:w-auto">
            <div className="flex-1 sm:flex-none p-5 bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl flex flex-col items-center text-center min-w-[140px]">
              <span className="text-3xl font-black text-white tracking-tight">{totalCount}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Total Mapeado</span>
            </div>
            <div className="flex-1 sm:flex-none p-5 bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/20 rounded-3xl flex flex-col items-center text-center min-w-[140px]">
              <span className="text-3xl font-black text-emerald-400 tracking-tight">{completedCount}</span>
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider mt-1">Concluídas</span>
            </div>
            <div className="flex-1 sm:flex-none p-5 bg-amber-500/10 backdrop-blur-xl border border-amber-500/20 rounded-3xl flex flex-col items-center text-center min-w-[140px]">
              <span className="text-3xl font-black text-amber-400 tracking-tight">{pendingCount}</span>
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider mt-1">Em Andamento</span>
            </div>
          </div>
        </div>
      </div>

      {/* Busca e Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou cliente..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-teal-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'PREVISTA', label: 'Previstas' },
            { id: 'ANDAMENTO', label: 'Em Andamento' },
            { id: 'CONCLUIDA', label: 'Concluídas' },
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
                statusFilter === filter.id
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* SlideOver 360º Wrapper */}
      <DeliverySlideOver 
        isOpen={isSlideOverOpen} 
        onClose={() => setIsSlideOverOpen(false)} 
        delivery={slideOverDelivery} 
      />

      {/* Modal CRUD */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl my-auto"
            >
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">
                {selectedDelivery ? 'Editar Entrega / Obrigação' : 'Nova Entrega / Obrigação'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Cliente</label>
                    <select required value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-semibold outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
                      <option value="">Selecione...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Competência</label>
                    <input required type="text" value={formData.competence} onChange={e => setFormData({...formData, competence: e.target.value})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-medium outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white" placeholder="Ex: 05/2026" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Frente</label>
                    <select required value={formData.frontId} onChange={e => setFormData({...formData, frontId: e.target.value})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-semibold outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
                      <option value="">Selecione...</option>
                      {fronts.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Responsável (Equipe)</label>
                    <select required value={formData.responsibleId} onChange={e => setFormData({...formData, responsibleId: e.target.value})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-semibold outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
                      <option value="">Selecione...</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Padronizado (Macro)</label>
                    <input required type="text" value={formData.standardizedName} onChange={e => setFormData({...formData, standardizedName: e.target.value})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-medium outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white" placeholder="Ex: Apuração PIS/COFINS" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-semibold outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
                      <option value="PREVISTA">Prevista</option>
                      <option value="ANDAMENTO">Em Andamento</option>
                      <option value="CONCLUIDA">Concluída</option>
                      <option value="INATIVA">Inativa</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Original (Detalhado)</label>
                  <input required type="text" value={formData.originalName} onChange={e => setFormData({...formData, originalName: e.target.value})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-medium outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white" placeholder="Ex: Apuração PIS/COFINS Lucro Real" />
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 text-sm font-extrabold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">Cancelar</button>
                  <button type="submit" disabled={submitting} className="px-6 py-3 text-sm font-extrabold text-white bg-teal-600 hover:bg-teal-700 rounded-2xl transition-colors flex items-center gap-2 shadow-lg shadow-teal-600/20">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lista Principal */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
          <Loader2 className="h-10 w-10 text-teal-500 animate-spin" />
          <p className="text-sm font-bold text-slate-500">Carregando matriz de conformidade...</p>
        </div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 dark:bg-slate-800 mb-6 shadow-inner">
            <CheckSquare className="h-8 w-8 text-teal-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Nenhuma entrega encontrada</h3>
          <p className="text-slate-500 font-medium mt-2 max-w-sm">
            Nenhuma obrigação corresponde ao filtro selecionado ou a base está vazia. Clique em "Executar Matriz Automática" para popular.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl shadow-sm">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-extrabold text-xs uppercase tracking-wider">Competência</th>
                <th className="px-6 py-4 font-extrabold text-xs uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 font-extrabold text-xs uppercase tracking-wider">Obrigação / Rotina</th>
                <th className="px-6 py-4 font-extrabold text-xs uppercase tracking-wider">Frente</th>
                <th className="px-6 py-4 font-extrabold text-xs uppercase tracking-wider">Responsável</th>
                <th className="px-6 py-4 font-extrabold text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-extrabold text-xs uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredDeliveries.map((delivery) => (
                <tr 
                  key={delivery.id} 
                  onClick={() => openSlideOver360(delivery)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                    {delivery.competence}
                  </td>
                  <td className="px-6 py-4 font-extrabold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {delivery.client?.name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-extrabold text-slate-900 dark:text-white">{delivery.standardizedName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{delivery.originalName}</p>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-400">
                    {delivery.front?.name || '-'}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                    {delivery.responsible?.name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    {delivery.status === 'CONCLUIDA' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Concluída
                      </span>
                    )}
                    {delivery.status === 'ANDAMENTO' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                        <Clock className="w-3.5 h-3.5" />
                        Em Andamento
                      </span>
                    )}
                    {delivery.status === 'PREVISTA' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        <Clock className="w-3.5 h-3.5" />
                        Prevista
                      </span>
                    )}
                    {delivery.status === 'INATIVA' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        Inativa
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {deleteConfirmId === delivery.id ? (
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1" onClick={e => e.stopPropagation()}>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2">Excluir?</span>
                          <button onClick={(e) => handleDelete(delivery.id, e)} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition-colors">Sim</button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors">Não</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={(e) => handleOpenEditModal(delivery, e)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-xs bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl transition-colors mr-2">Editar</button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(delivery.id); }} className="text-slate-400 hover:text-red-600 font-bold text-xs bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl transition-colors">Excluir</button>
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
