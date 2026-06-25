'use client';

import React, { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Search, 
  Loader2,
  TrendingUp,
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  ArrowRight,
  DollarSign,
  Plus,
  BarChart3,
  Flame,
  FileText
} from 'lucide-react';
import { apiRequest } from '@/utils/api';

interface Opportunity {
  id: string;
  clientId: string;
  title: string;
  description: string;
  category: string;
  estimatedValue: number;
  status: string;
  createdAt: string;
  client: { name: string; monthlyFee?: number };
}

const tableVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const rowVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export default function CycleOpportunitiesPage({
  params,
}: {
  params: Promise<{ id: string; cycleId: string }>;
}) {
  const { id, cycleId } = use(params);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal Novo/Edicao
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    clientId: '',
    title: '',
    description: '',
    category: 'EXCESS_HOURS',
    estimatedValue: 1500,
    status: 'IDENTIFICADA'
  });

  const fetchOpportunities = async () => {
    try {
      const data = await apiRequest(`/opportunities?tenantId=${id}`).catch(() => []);
      setOpportunities(data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, [id]);

  const handleOpenCreateModal = async () => {
    setIsModalOpen(true);
    try {
      const c = await apiRequest(`/clients?tenantId=${id}`).catch(() => []);
      setClients(c);
      if (c.length) {
        setFormData(prev => ({ ...prev, clientId: c[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerScan = async () => {
    setScanning(true);
    try {
      const res = await apiRequest('/opportunities/trigger-scan', {
        method: 'POST',
        body: JSON.stringify({ tenantId: id })
      });
      alert(`Scanner de BI Executado com Sucesso! Foram identificadas ${res.generatedCount} novas oportunidades automáticas de Upsell / Negociação para a operação deste escritório.`);
      fetchOpportunities();
    } catch (err: any) {
      alert(err.message || 'Erro ao executar o scanner de oportunidades.');
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/opportunities', {
        method: 'POST',
        body: JSON.stringify({ ...formData, tenantId: id })
      });
      setIsModalOpen(false);
      fetchOpportunities();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar oportunidade.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (opId: string, newStatus: string) => {
    try {
      await apiRequest(`/opportunities/${opId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, tenantId: id })
      });
      fetchOpportunities();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar status.');
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'EXCESS_HOURS':
        return { label: 'Estouro de Horas', classes: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
      case 'NFE_VOLUME_SPIKE':
        return { label: 'Pico de NF-e', classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
      case 'FREQUENT_ADMISSIONS':
        return { label: 'Alta Rotatividade (DP)', classes: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
      default:
        return { label: 'Revisão / Upsell', classes: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' };
    }
  };

  // Filtragem
  const filteredOpportunities = opportunities.filter(op => {
    const matchQuery = (op.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                       (op.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (op.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'ALL') return matchQuery;
    return matchQuery && op.status === statusFilter;
  });

  // Metricas BI
  const totalValue = opportunities.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);
  const wonValue = opportunities.filter(op => op.status === 'GANHA').reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);
  const pendingCount = opportunities.filter(op => op.status !== 'GANHA' && op.status !== 'PERDIDA').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Top Header / Banner Premium */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden"
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
        
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-gradient-to-br from-amber-100 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/10 rounded-full blur-3xl opacity-60 pointer-events-none" />

        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-500/30 shrink-0 transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <Zap className="w-8 h-8 fill-white/20" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Oportunidades & BI do Ciclo
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 leading-relaxed max-w-xl text-sm">
              Ferramenta Interna TASS para mineração de upsell, estouro de horas e inteligência comercial do escritório.
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 relative z-10 shrink-0">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleTriggerScan}
            disabled={scanning}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3.5 text-sm font-bold shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {scanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Flame className="h-4 w-4 text-white fill-white" />
            )}
            Scanner Automático de BI
          </motion.button>

          <button 
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3.5 text-sm font-bold shadow-lg shadow-slate-900/20 dark:shadow-slate-100/20 hover:bg-slate-800 dark:hover:bg-slate-200 hover:-translate-y-0.5 transition-all active:scale-95 duration-200"
          >
            <Plus className="h-4 w-4" />
            Nova Oportunidade
          </button>
        </div>
      </motion.div>

      {/* Painel de Metricas BI (Dashboard Extra Premium Luminous) */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-slate-50 dark:bg-slate-950/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="flex flex-col gap-2 max-w-xl">
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] bg-emerald-500/10 px-3 py-1 rounded-full w-max border border-emerald-500/20 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" />
              Inteligência Comercial TASS
            </span>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
              R$ {totalValue.toFixed(2)} em Pipeline
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed mt-1">
              O motor examina contratos que ultrapassaram a franquia de horas no timesheet, picos de processamento fiscal e rotatividade de departamento pessoal neste escritório para propor revisões de honorários.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-4 w-full lg:w-auto">
            <div className="flex-1 sm:flex-none p-6 bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center text-center min-w-[160px] shadow-sm">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">R$ {wonValue.toFixed(2)}</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mt-1">Novas Receitas (Ganhas)</span>
            </div>
            <div className="flex-1 sm:flex-none p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center text-center min-w-[160px] shadow-sm">
              <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{pendingCount}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Negociações Ativas</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Busca e Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar oportunidade ou cliente..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'IDENTIFICADA', label: 'Identificadas' },
            { id: 'EM_NEGOCIACAO', label: 'Em Negociação' },
            { id: 'PROPOSTA_ENVIADA', label: 'Proposta Enviada' },
            { id: 'GANHA', label: 'Ganhas' },
            { id: 'PERDIDA', label: 'Perdidas' },
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
                statusFilter === filter.id
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modal de Criação */}
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
                Nova Oportunidade Comercial
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Cliente Alvo</label>
                  <select required value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-semibold outline-none focus:border-amber-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
                    <option value="">Selecione...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Título da Oportunidade</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-medium outline-none focus:border-amber-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white" placeholder="Ex: Aditivo Contratual - Folha de Pagamento" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                    <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-semibold outline-none focus:border-amber-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
                      <option value="EXCESS_HOURS">Estouro de Horas</option>
                      <option value="NFE_VOLUME_SPIKE">Pico de NF-e</option>
                      <option value="FREQUENT_ADMISSIONS">Alta Rotatividade (DP)</option>
                      <option value="TAX_RECOVERY">Recuperação Tributária</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Valor Estimado (R$)</label>
                    <input required type="number" step="0.01" value={formData.estimatedValue} onChange={e => setFormData({...formData, estimatedValue: Number(e.target.value)})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-medium outline-none focus:border-amber-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white" placeholder="Ex: 2500.00" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição / Motivo</label>
                  <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full h-24 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-sm font-medium outline-none focus:border-amber-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white resize-none" placeholder="Informe os detalhes observados na operação..." />
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 text-sm font-extrabold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">Cancelar</button>
                  <button type="submit" disabled={submitting} className="px-6 py-3 text-sm font-extrabold text-white bg-amber-500 hover:bg-amber-600 rounded-2xl transition-colors flex items-center gap-2 shadow-lg shadow-amber-500/20">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Cadastrar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Grid de Oportunidades */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
          <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
          <p className="text-sm font-bold text-slate-500">Carregando oportunidades comerciais...</p>
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-slate-800 mb-6 shadow-inner">
            <Zap className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Nenhuma oportunidade listada</h3>
          <p className="text-slate-500 font-medium mt-2 max-w-sm">
            Clique no botão "Scanner Automático de BI" acima para buscar anomalias operacionais neste escritório e sugerir revisões de honorários automaticamente.
          </p>
        </div>
      ) : (
        <motion.div 
          variants={tableVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredOpportunities.map((op) => {
            const badge = getCategoryBadge(op.category);

            return (
              <motion.div 
                variants={rowVariants}
                key={op.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-amber-400 dark:hover:border-amber-500/50 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="flex flex-col gap-4">
                  
                  {/* Cabeçalho do Card */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${badge.classes}`}>
                      {badge.label}
                    </span>
                    
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      op.status === 'GANHA' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                      op.status === 'PERDIDA' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700' :
                      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}>
                      {op.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Título e Cliente */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      <Building2 className="w-3.5 h-3.5 text-amber-500" />
                      {op.client?.name || 'Cliente Não Especificado'}
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {op.title}
                    </h3>
                  </div>

                  {/* Descrição Operacional */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                    {op.description}
                  </p>

                  {/* Valor Estimado */}
                  <div className="flex items-baseline justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Honorário / Receita Extra</span>
                    <span className="text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                      R$ {op.estimatedValue?.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Ações de Funil */}
                <div className="flex items-center justify-between gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {op.status !== 'GANHA' && op.status !== 'PERDIDA' && (
                    <>
                      <button 
                        onClick={() => handleUpdateStatus(op.id, 'PERDIDA')}
                        className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-600 dark:text-slate-400 hover:text-red-600 text-xs font-extrabold rounded-xl transition-colors text-center"
                      >
                        Descartar
                      </button>

                      {op.status === 'IDENTIFICADA' && (
                        <button 
                          onClick={() => handleUpdateStatus(op.id, 'EM_NEGOCIACAO')}
                          className="flex-1 py-2.5 bg-amber-50 hover:bg-amber-500 text-amber-700 hover:text-white dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500 dark:hover:text-white text-xs font-extrabold rounded-xl transition-colors flex items-center justify-center gap-1"
                        >
                          Negociar
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {op.status === 'EM_NEGOCIACAO' && (
                        <button 
                          onClick={() => handleUpdateStatus(op.id, 'PROPOSTA_ENVIADA')}
                          className="flex-1 py-2.5 bg-amber-50 hover:bg-amber-500 text-amber-700 hover:text-white dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500 dark:hover:text-white text-xs font-extrabold rounded-xl transition-colors flex items-center justify-center gap-1"
                        >
                          Proposta
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {op.status === 'PROPOSTA_ENVIADA' && (
                        <button 
                          onClick={() => handleUpdateStatus(op.id, 'GANHA')}
                          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-colors flex items-center justify-center gap-1 shadow-md shadow-emerald-600/20"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ganhamos!
                        </button>
                      )}
                    </>
                  )}

                  {op.status === 'GANHA' && (
                    <div className="w-full py-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold rounded-xl text-center flex items-center justify-center gap-1 border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Oportunidade Concluída (Upsell Ativo)
                    </div>
                  )}

                  {op.status === 'PERDIDA' && (
                    <div className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-extrabold rounded-xl text-center border border-slate-200 dark:border-slate-700">
                      Oportunidade Descartada
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
