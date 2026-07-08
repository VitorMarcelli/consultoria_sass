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
  FileText,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon
} from 'lucide-react';
import { apiRequest } from '@/utils/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface Opportunity {
  id: string;
  clientId: string;
  title: string;
  description: string;
  observations: string;
  category: string;
  potentialValue: number;
  status: string;
  createdAt: string;
  client: { name: string; monthlyFee?: number };
}

interface DashboardData {
  kpis: {
    totalRevenue: number;
    totalCosts: number;
    margin: number;
    totalOpportunities: number;
  };
  charts: {
    evolution: any[];
    categories: any[];
  };
  recentActivity: Opportunity[];
}

const COLORS = ['#f59e0b', '#10b981', '#f43f5e', '#3b82f6'];

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
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
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

  const fetchData = async () => {
    try {
      const [opps, dash] = await Promise.all([
        apiRequest(`/opportunities?tenantId=${id}`).catch(() => []),
        apiRequest(`/opportunities/dashboard?tenantId=${id}`).catch(() => null)
      ]);
      setOpportunities(opps);
      setDashboardData(dash);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
      const res = await apiRequest('/opportunities/scan', {
        method: 'POST',
        body: JSON.stringify({ tenantId: id })
      });
      alert(`Scanner de BI Executado com Sucesso! Foram identificadas ${res.generatedCount} novas oportunidades automáticas usando a IA da Sevilha.`);
      fetchData();
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
      fetchData();
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
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar status.');
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'RETENTION':
      case 'EXCESS_HOURS':
        return { label: 'Risco de Retenção', classes: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
      case 'CROSSSELL':
      case 'NFE_VOLUME_SPIKE':
        return { label: 'Oportunidade Cross-Sell', classes: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
      case 'UPSELL':
      case 'FREQUENT_ADMISSIONS':
        return { label: 'Oportunidade Upsell', classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
      default:
        return { label: 'Oportunidade', classes: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' };
    }
  };

  const filteredOpportunities = opportunities.filter(op => {
    const matchQuery = (op.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                       (op.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (op.observations || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'ALL') return matchQuery;
    return matchQuery && op.status === statusFilter;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Dashboard de Estratégia
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-sm">
            Monitoramento de rentabilidade, horas gastas e oportunidades geradas por Inteligência Artificial.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleTriggerScan}
            disabled={scanning}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 text-sm font-bold shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all disabled:opacity-50"
          >
            {scanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Flame className="h-4 w-4 fill-white" />
            )}
            Gerar Insights com IA
          </motion.button>
          <button 
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white px-6 py-3 text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <Plus className="h-4 w-4" />
            Nova
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
      ) : (
        <>
          {/* KPI Cards */}
          {dashboardData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-sm font-bold">Total Honorários (Ativos)</span>
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                  R$ {dashboardData.kpis.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs font-semibold text-emerald-500 flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3 h-3" /> Receita Recorrente Base
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-sm font-bold">Custo de Horas Mês</span>
                  <Activity className="w-5 h-5 text-rose-500" />
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                  R$ {dashboardData.kpis.totalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs font-semibold text-rose-500 flex items-center gap-1 mt-1">
                  <ArrowDownRight className="w-3 h-3" /> Custo Operacional Consolidado
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-sm font-bold">Margem Bruta (Estimada)</span>
                  <TrendingUp className="w-5 h-5 text-teal-500" />
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                  R$ {dashboardData.kpis.margin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1 mt-1">
                  Rentabilidade da Carteira
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-sm font-bold">Oportunidades IA</span>
                  <Zap className="w-5 h-5 text-amber-500" />
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                  {dashboardData.kpis.totalOpportunities}
                </div>
                <div className="text-xs font-semibold text-amber-600 dark:text-amber-500 flex items-center gap-1 mt-1">
                  Identificadas e mapeadas
                </div>
              </div>
            </div>
          )}

          {/* Charts Row */}
          {dashboardData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-500" />
                  Evolução de Honorários vs Custos
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboardData.charts.evolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `R$${value/1000}k`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [`R$ ${value.toFixed(2)}`, undefined]}
                      />
                      <Area type="monotone" dataKey="revenue" name="Receitas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                      <Area type="monotone" dataKey="costs" name="Custos" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-amber-500" />
                  Distribuição de Oportunidades
                </h3>
                <div className="h-[250px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardData.charts.categories}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {dashboardData.charts.categories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '600' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Oportunidades da IA (Lista e Filtros) */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mt-8">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-amber-500" />
                Pipeline de Oportunidades
              </h3>
              <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto w-full sm:w-auto">
                {[
                  { id: 'ALL', label: 'Todas' },
                  { id: 'IDENTIFICADA', label: 'Identificadas' },
                  { id: 'EM_NEGOCIACAO', label: 'Em Negociação' },
                  { id: 'PROPOSTA_ENVIADA', label: 'Proposta Enviada' },
                  { id: 'GANHA', label: 'Ganhas' },
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setStatusFilter(filter.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                      statusFilter === filter.id
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar oportunidade, cliente, ou detalhes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-11 pr-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {filteredOpportunities.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 font-medium">Nenhuma oportunidade encontrada com os filtros atuais.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="pb-4 font-semibold">Cliente</th>
                      <th className="pb-4 font-semibold">Oportunidade (Insight IA)</th>
                      <th className="pb-4 font-semibold">Categoria</th>
                      <th className="pb-4 font-semibold">Valor Potencial</th>
                      <th className="pb-4 font-semibold">Status</th>
                      <th className="pb-4 font-semibold text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {filteredOpportunities.map((op) => {
                      const badge = getCategoryBadge(op.category);
                      return (
                        <tr key={op.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-5 pr-4 align-top">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
                              <span className="text-sm font-bold text-slate-900 dark:text-white">{op.client?.name}</span>
                            </div>
                          </td>
                          <td className="py-5 pr-4 align-top max-w-sm">
                            <div className="text-sm font-extrabold text-slate-900 dark:text-white mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                              {op.title}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2">
                              {op.observations || op.description}
                            </div>
                          </td>
                          <td className="py-5 pr-4 align-top">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider whitespace-nowrap ${badge.classes}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-5 pr-4 align-top">
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              {op.potentialValue ? `R$ ${op.potentialValue.toFixed(2)}` : 'A Calcular'}
                            </span>
                          </td>
                          <td className="py-5 pr-4 align-top">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider whitespace-nowrap ${
                              op.status === 'GANHA' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                              op.status === 'PERDIDA' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200' :
                              'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            }`}>
                              {op.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-5 align-top text-right">
                            <select 
                              value={op.status}
                              onChange={(e) => handleUpdateStatus(op.id, e.target.value)}
                              className="h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none px-2 focus:border-amber-500 cursor-pointer"
                            >
                              <option value="IDENTIFICADA">Identificada</option>
                              <option value="EM_NEGOCIACAO">Negociando</option>
                              <option value="PROPOSTA_ENVIADA">Proposta Enviada</option>
                              <option value="GANHA">Ganha!</option>
                              <option value="PERDIDA">Perdida/Descartar</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

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
                Nova Oportunidade Manual
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Cliente</label>
                  <select required value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-semibold outline-none focus:border-amber-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
                    <option value="">Selecione...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Título</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-medium outline-none focus:border-amber-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                    <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-semibold outline-none focus:border-amber-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
                      <option value="RETENTION">Risco / Retenção</option>
                      <option value="UPSELL">Upsell (Mais valor)</option>
                      <option value="CROSSSELL">Cross-sell (Outro serviço)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Valor Estimado (R$)</label>
                    <input required type="number" step="0.01" value={formData.estimatedValue} onChange={e => setFormData({...formData, estimatedValue: Number(e.target.value)})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-medium outline-none focus:border-amber-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Observações</label>
                  <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full h-24 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-sm font-medium outline-none focus:border-amber-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white resize-none" />
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-5 py-3 text-sm font-extrabold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">Cancelar</button>
                  <button type="submit" disabled={submitting} className="w-full sm:w-auto px-6 py-3 text-sm font-extrabold text-white bg-amber-500 hover:bg-amber-600 rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Cadastrar
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
