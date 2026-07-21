'use client';

import React, { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  FileCheck, 
  Plus, 
  Filter, 
  DownloadCloud, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Loader2,
  CheckSquare,
  Building2,
  ChevronDown,
  LayoutGrid,
  CalendarClock,
  List
} from 'lucide-react';
import { apiRequest } from '@/utils/api';
import DeliveryTaskModal from '@/components/DeliveryTaskModal';
import DeliveryKanbanBoard from '@/components/DeliveryKanbanBoard';
import DeliveryAllocationBoard from '@/components/DeliveryAllocationBoard';
import DashboardMappingTab from './components/DashboardMappingTab';
import DashboardCapacityTab from './components/DashboardCapacityTab';
import DashboardLevelingTab from './components/DashboardLevelingTab';

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
  priority?: string;
  estimatedTimeMinutes?: number;
  realTimeMinutes?: number;
  executionDeadline?: string | null;
  legalDeadline?: string | null;
}

const tableVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export default function CycleDeliveriesPage({
  params,
}: {
  params: Promise<{ id: string; cycleId: string }>;
}) {
  const { id, cycleId } = use(params);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [globalCapacity, setGlobalCapacity] = useState<any[]>([]);
  const [showIdleMembers, setShowIdleMembers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generatingMonthly, setGeneratingMonthly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'LIST' | 'KANBAN' | 'ALLOCATION'>('LIST');
  const [profile, setProfile] = useState<any>(null);
  
  // Grouping State (Monday.com style)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  
  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  // Task Modal 360º
  const [selectedSlideOverDelivery, setSelectedSlideOverDelivery] = useState<any | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

  // Modal CRUD
  const [activeTab, setActiveTab] = useState<'LIST' | 'MAPPING' | 'CAPACITY' | 'LEVELING'>('LIST');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [formData, setFormData] = useState({ clientId: '', frontId: '', responsibleId: '', competence: '', originalName: '', standardizedName: '', status: 'PREVISTA', priority: 'MEDIUM', estimatedTimeMinutes: '', executionDeadline: '' });
  const [cycleComp, setCycleComp] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [clients, setClients] = useState<any[]>([]);
  const [fronts, setFronts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [currentClassification, setCurrentClassification] = useState<any | null>(null);

  useEffect(() => {
    if (formData.clientId && formData.frontId && isModalOpen) {
      apiRequest(`/clients/${formData.clientId}/fronts/${formData.frontId}/classification?tenantId=${id}`)
        .then(res => setCurrentClassification(res))
        .catch(() => setCurrentClassification(null));
    } else {
      setCurrentClassification(null);
    }
  }, [formData.clientId, formData.frontId, id, isModalOpen]);

  const fetchDeliveries = async () => {
    try {
      const user = await apiRequest('/users/me').catch(() => null);
      if (user) setProfile(user);

      // 1) Busca os dados do ciclo para saber a competência
      const cycleData = await apiRequest(`/management-cycles/${cycleId}?tenantId=${id}`).catch(() => null);
      let cycleCompetence = '';
      if (cycleData) {
        const mm = String(cycleData.month).padStart(2, '0');
        cycleCompetence = `${mm}/${cycleData.year}`;
        setCycleComp(cycleCompetence);
      }

      // 2) Traz as entregas atreladas ao tenant (escritorio)
      const data = await apiRequest(`/deliveries?tenantId=${id}`).catch(() => []);
      
      // 3) Filtra apenas as entregas deste ciclo (mesma competência)
      const cycleDeliveries = cycleCompetence ? data.filter((d: any) => d.competence === cycleCompetence) : data;
      
      setDeliveries(cycleDeliveries);

      // 4) Busca dados globais de capacidade
      const capData = await apiRequest(`/dashboard/capacity/${cycleId}/all?tenantId=${id}`).catch(() => null);
      if (capData && capData.capacityData) {
        setGlobalCapacity(capData.capacityData);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [id]);

  const loadModalData = async () => {
    const [c, f, e] = await Promise.all([
      apiRequest(`/clients?tenantId=${id}`).catch(() => []),
      apiRequest(`/structures/fronts?tenantId=${id}`).catch(() => []),
      apiRequest(`/employees?tenantId=${id}`).catch(() => [])
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
        clientId: '',
        frontId: '',
        responsibleId: '',
        competence: cycleComp || new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
        originalName: '',
        standardizedName: '',
        status: 'PREVISTA',
        priority: 'MEDIUM',
        estimatedTimeMinutes: '',
        executionDeadline: ''
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
        status: delivery.status,
        priority: delivery.priority || 'MEDIUM',
        estimatedTimeMinutes: delivery.estimatedTimeMinutes ? String(delivery.estimatedTimeMinutes) : '',
        executionDeadline: delivery.executionDeadline ? new Date(delivery.executionDeadline).toISOString().split('T')[0] : ''
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
          body: JSON.stringify({ ...formData, tenantId: id })
        });
      } else {
        await apiRequest('/deliveries', {
          method: 'POST',
          body: JSON.stringify({ ...formData, tenantId: id })
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

  const handleDelete = async (delId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setLoading(true);
      await apiRequest(`/deliveries/${delId}?tenantId=${id}`, { method: 'DELETE' });
      setDeleteConfirmId(null);
      fetchDeliveries();
    } catch (err: unknown) {
      console.error(err);
      alert('Erro ao excluir entrega.');
      setLoading(false);
    }
  };

  const handleQuickStatusChange = async (deliveryId: string, newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setLoading(true);
      await apiRequest(`/deliveries/${deliveryId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ tenantId: id, status: newStatus, authorName: 'Usuário Web' })
      });
      fetchDeliveries();
    } catch (err: unknown) {
      console.error(err);
      alert('Erro ao alterar status.');
      setLoading(false);
    }
  };

  // Dispara a geracao automatica de matriz de conformidade para o ciclo
  const handleGenerateMonthly = async () => {
    setGeneratingMonthly(true);
    try {
      // Utiliza a competência do ciclo atual para gerar as entregas, em vez do mês atual da máquina.
      const res = await apiRequest(`/deliveries/generate-monthly`, {
        method: 'POST',
        body: JSON.stringify({ tenantId: id, targetCompetence: cycleComp }) // Precisamos da competência
      });
      alert(`Matriz de Conformidade executada! ${res.generatedCount} novas entregas geradas a partir dos templates ativos para o ciclo.`);
      fetchDeliveries();
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar entregas mensais.');
    } finally {
      setGeneratingMonthly(false);
    }
  };

  const openTaskModal = (delivery: Delivery) => {
    setSelectedSlideOverDelivery(delivery);
    setIsSlideOverOpen(true);
  };

  // Filtragem
  const filteredDeliveries = deliveries.filter(d => {
    // Regra: Responsável comum só vê suas próprias tarefas
    if (profile?.role === 'OPERATOR' && d.responsibleId !== profile.id && d.responsible?.name !== profile?.name) {
      return false;
    }

    const matchQuery = (d.standardizedName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                       (d.originalName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                       (d.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'ALL') return matchQuery;
    return matchQuery && d.status === statusFilter;
  });

  // Grouping by Responsible (Team) - Monday Style
  const groupedDeliveries = filteredDeliveries.reduce((acc, delivery) => {
    const responsibleName = delivery.responsible?.name || 'Não Atribuído';
    if (!acc[responsibleName]) {
      acc[responsibleName] = [];
    }
    acc[responsibleName].push(delivery);
    return acc;
  }, {} as Record<string, Delivery[]>);

  const handleAllocationChange = async (deliveryId: string, newDate: string) => {
    try {
      const execDate = newDate ? new Date(`${newDate}T12:00:00Z`).toISOString() : null;
      await apiRequest(`/deliveries/${deliveryId}`, {
        method: 'PATCH',
        body: JSON.stringify({ tenantId: id, executionDeadline: execDate })
      });
      fetchDeliveries();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar alocação.');
    }
  };

  const handleAutoSchedule = async () => {
    if (!confirm('Deseja alocar automaticamente todas as entregas sem data para os dias disponíveis?')) return;
    
    // Simplistic greedy algorithm running in frontend
    const unallocated = deliveries.filter(d => !d.executionDeadline);
    if (unallocated.length === 0) {
      alert('Nenhuma entrega pendente de alocação.');
      return;
    }

    // Sort by priority and legal deadline
    unallocated.sort((a, b) => {
      if (a.priority === 'HIGH' && b.priority !== 'HIGH') return -1;
      if (a.priority !== 'HIGH' && b.priority === 'HIGH') return 1;
      const dateA = a.legalDeadline ? new Date(a.legalDeadline).getTime() : Infinity;
      const dateB = b.legalDeadline ? new Date(b.legalDeadline).getTime() : Infinity;
      return dateA - dateB;
    });

    let updatedCount = 0;
    
    for (const d of unallocated) {
      const respId = d.responsibleId;
      if (!respId) continue;

      const cap = globalCapacity.find(c => c.employee === d.responsible?.name);
      const dailyCapMins = (cap?.available || 6) * 60;
      
      // Determine number of days in cycle
      const [m, y] = cycleComp.split('/');
      const days = new Date(parseInt(y), parseInt(m), 0).getDate();
      
      for (let day = 1; day <= days; day++) {
        const dateStr = `${y}-${m}-${String(day).padStart(2, '0')}`;
        
        // Calculate currently used mins for this employee on this date
        const usedMins = deliveries
          .filter(del => del.responsibleId === respId && del.executionDeadline?.startsWith(dateStr))
          .reduce((acc, del) => acc + (del.estimatedTimeMinutes || 0), 0);
        
        const taskMins = d.estimatedTimeMinutes || 0;
        
        if (usedMins + taskMins <= dailyCapMins) {
          // Allocate here
          const execDate = new Date(`${dateStr}T12:00:00Z`).toISOString();
          try {
            await apiRequest(`/deliveries/${d.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ tenantId: id, executionDeadline: execDate })
            });
            // Optimistically update local deliveries to affect subsequent calculations
            d.executionDeadline = execDate;
            updatedCount++;
          } catch (err) {
            console.error(err);
          }
          break;
        }
      }
    }
    
    alert(`${updatedCount} entregas alocadas automaticamente!`);
    fetchDeliveries();
  };

  const handleKanbanStatusChange = async (deliveryId: string, newStatus: string) => {
    // Optimistic UI update
    setDeliveries(prev => prev.map(d => d.id === deliveryId ? { ...d, status: newStatus } : d));
    
    try {
      await apiRequest(`/deliveries/${deliveryId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, tenantId: id, authorName: 'Usuário Web' })
      });
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar status.');
      fetchDeliveries(); // Revert on failure
    }
  };

  // Estatisticas para o painel de conformidade
  const totalCount = deliveries.length;
  const completedCount = deliveries.filter(d => d.status === 'CONCLUIDA').length;
  const pendingCount = deliveries.filter(d => d.status === 'PREVISTA' || d.status === 'ANDAMENTO' || d.status === 'ATRASADA').length;
  const complianceRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  // Estatisticas para o painel de Ociosidade Global
  const totalAvailable = globalCapacity.reduce((acc, curr) => acc + (curr.available || 0), 0);
  const totalAllocated = globalCapacity.reduce((acc, curr) => acc + (curr.recurrent || 0) + (curr.extra || 0) + (curr.rework || 0), 0);
  const totalIdle = Math.max(0, totalAvailable - totalAllocated);
  const idlePercentage = totalAvailable > 0 ? Math.round((totalIdle / totalAvailable) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Top Header Minimalista (Monday Style) */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-teal-500/10 dark:bg-teal-500/20 rounded-lg flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
              Gestão de Entregas
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {deliveries.length} Mapeadas no ciclo
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                {complianceRate}% no Prazo
              </span>
            </div>
          </div>
        </div>
        
        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2 shrink-0">
          {profile?.role !== 'OPERATOR' && (
            <button 
              onClick={handleGenerateMonthly}
              disabled={generatingMonthly}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              {generatingMonthly ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Gerar Automático
            </button>
          )}

          {profile?.role !== 'OPERATOR' && (
            <button 
              onClick={handleOpenCreateModal}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 text-white px-5 py-2 text-xs font-bold shadow-sm shadow-teal-600/20 hover:bg-teal-700 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova Obrigação
            </button>
          )}
        </div>
      </motion.div>

      {/* Tabs Navigation (Pill Design) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl w-max max-w-full overflow-x-auto custom-scrollbar">
        {[
          { id: 'LIST', label: 'Lista de Entregas' },
          { id: 'MAPPING', label: 'Diagnóstico' },
          { id: 'CAPACITY', label: 'Capacidade' },
          { id: 'LEVELING', label: 'Nivelamento' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`relative px-6 py-2.5 rounded-xl font-bold text-sm transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-teal-700 dark:text-teal-300'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'MAPPING' && <DashboardMappingTab tenantId={id} cycleId={cycleId} />}
      {activeTab === 'CAPACITY' && <DashboardCapacityTab tenantId={id} cycleId={cycleId} />}
      {activeTab === 'LEVELING' && <DashboardLevelingTab tenantId={id} cycleId={cycleId} />}

      {/* Painel de Matriz de Conformidade (Dashboard Extra Premium Luminous) */}
      <div className={activeTab !== 'LIST' ? 'hidden' : ''}>
        <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8">
          <div className="flex flex-col gap-2 max-w-xl">
            <span className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-[0.2em] bg-teal-500/10 px-3 py-1 rounded-full w-max border border-teal-500/20">
              Índice de Conformidade do Ciclo
            </span>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
              {complianceRate}% das obrigações no prazo
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed mt-1">
              O motor automático avalia e cria rotinas atreladas a frentes e responsáveis para este ciclo mensal. Acompanhe os comprovantes de entrega pelo painel 360º.
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap gap-4 w-full xl:w-auto">
            <div className="flex-1 sm:flex-none p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center text-center min-w-[140px] shadow-sm">
              <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{totalCount}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Total Mapeado</span>
            </div>
            <div className="flex-1 sm:flex-none p-6 bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center text-center min-w-[140px] shadow-sm">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{completedCount}</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mt-1">Concluídas</span>
            </div>
            <div className="flex-1 sm:flex-none p-6 bg-amber-50/50 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col items-center text-center min-w-[140px] shadow-sm">
              <span className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{pendingCount}</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mt-1">Em Andamento</span>
            </div>
            
            <div 
              onClick={() => setShowIdleMembers(!showIdleMembers)}
              className={`flex-1 sm:flex-none p-6 rounded-2xl flex flex-col items-center text-center min-w-[140px] shadow-sm relative cursor-pointer transition-all ${
                showIdleMembers 
                  ? 'bg-rose-50 dark:bg-rose-900/30 border-2 border-rose-500 shadow-md scale-105' 
                  : 'bg-rose-50/50 dark:bg-rose-500/10 border border-rose-500/20 hover:bg-rose-50 dark:hover:bg-rose-500/20'
              }`}
              title="Clique para ver os membros ociosos"
            >
              <span className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{Math.floor(totalIdle)}h</span>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-500 uppercase tracking-wider mt-1 flex items-center gap-1">
                Tempo Livre
              </span>
              <div className="absolute top-0 right-0 flex items-center justify-center px-2 py-1 rounded-bl-xl rounded-tr-2xl bg-rose-500 text-white text-[10px] font-black shadow-sm">
                {idlePercentage}% OCIOSO
              </div>
            </div>
          </div>
        </div>

        {/* Painel Expansível de Membros Ociosos */}
        <AnimatePresence>
          {showIdleMembers && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    Membros com Capacidade Livre
                  </h3>
                  <button 
                    onClick={() => {
                       // Abre o modal para delegar ou criar tarefa extra
                       setFormData({...formData, status: 'PREVISTA', priority: 'MEDIUM'});
                       setSelectedDelivery(null);
                       setIsModalOpen(true);
                    }}
                    className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-xl transition-colors shadow-sm"
                  >
                    + Preencher Ociosidade
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {globalCapacity
                    .map(c => {
                      const allocated = (c.recurrent || 0) + (c.extra || 0) + (c.rework || 0);
                      const idle = Math.max(0, (c.available || 0) - allocated);
                      return { ...c, idle };
                    })
                    .filter(c => c.idle > 0)
                    .sort((a, b) => b.idle - a.idle)
                    .map((emp, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{emp.employee}</span>
                        <span className="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-md">{emp.idle}h livres</span>
                      </div>
                    ))}
                  {globalCapacity.filter(c => Math.max(0, (c.available || 0) - ((c.recurrent || 0) + (c.extra || 0) + (c.rework || 0))) > 0).length === 0 && (
                    <div className="col-span-full text-center text-sm font-medium text-slate-500 py-4">
                      A equipe está 100% alocada! Nenhum tempo ocioso.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Novo Modal Centralizado estilo Trello */}
      <DeliveryTaskModal 
        isOpen={isSlideOverOpen}
        onClose={() => {
          setIsSlideOverOpen(false);
          fetchDeliveries(); // Recarrega para atualizar status caso tenham mudado
        }}
        delivery={selectedSlideOverDelivery}
        tenantId={id}
        userRole={profile?.role}
      />

      {/* Busca e Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm">
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

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="hidden sm:flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl shadow-sm">
            <button
              onClick={() => setViewMode('LIST')}
              className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                viewMode === 'LIST' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Visualização em Lista"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                viewMode === 'KANBAN' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Visualização Kanban"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('ALLOCATION')}
              className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                viewMode === 'ALLOCATION' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Alocação Diária"
            >
              <CalendarClock className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'PREVISTA', label: 'Previstas' },
            { id: 'ANDAMENTO', label: 'Em Andamento' },
            { id: 'ATRASADA', label: 'Atrasadas' },
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
      </div>

      {/* Modal CRUD */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl my-auto relative overflow-hidden"
            >
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">
                {selectedDelivery ? 'Editar Entrega / Obrigação' : 'Nova Entrega / Obrigação'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Frente</label>
                    <select required value={formData.frontId} onChange={e => setFormData({...formData, frontId: e.target.value})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-semibold outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
                      <option value="">Selecione...</option>
                      {fronts.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Responsável (Equipe)</label>
                    <select 
                      required 
                      value={formData.responsibleId} 
                      onChange={e => setFormData({...formData, responsibleId: e.target.value})} 
                      disabled={!formData.clientId || !formData.frontId}
                      className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-semibold outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {!formData.clientId || !formData.frontId 
                          ? 'Selecione Cliente e Frente primeiro...' 
                          : !currentClassification || (!currentClassification.operator1Id && !currentClassification.operator2Id && !currentClassification.leaderId)
                            ? 'Nenhum responsável configurado para este cliente'
                            : 'Selecione...'}
                      </option>
                      {employees
                        .filter(emp => {
                          if (!currentClassification) return false;
                          const allowed = [currentClassification.operator1Id, currentClassification.operator2Id, currentClassification.leaderId];
                          return allowed.includes(emp.id);
                        })
                        .map(emp => {
                          const cap = globalCapacity.find(c => c.employee === emp.name);
                          let idleText = '';
                          if (cap) {
                            const idle = Math.max(0, (cap.available || 0) - ((cap.recurrent || 0) + (cap.extra || 0) + (cap.rework || 0)));
                            idleText = ` (${idle}h livres)`;
                          }
                          return (
                            <option key={emp.id} value={emp.id}>
                              {emp.name}{idleText}
                            </option>
                          );
                        })
                      }
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Padronizado (Macro)</label>
                    <input required type="text" value={formData.standardizedName} onChange={e => setFormData({...formData, standardizedName: e.target.value})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-medium outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white" placeholder="Ex: Apuração PIS/COFINS" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-semibold outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
                      <option value="PREVISTA">Prevista</option>
                      <option value="ANDAMENTO">Em Andamento</option>
                      <option value="ATRASADA">Atrasada</option>
                      <option value="CONCLUIDA">Concluída</option>
                      <option value="INATIVA">Inativa</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Prioridade</label>
                    <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-semibold outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
                      <option value="HIGH">Alta</option>
                      <option value="MEDIUM">Média</option>
                      <option value="LOW">Baixa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tempo Padrão (Minutos)</label>
                    <input type="number" required value={formData.estimatedTimeMinutes} onChange={e => setFormData({...formData, estimatedTimeMinutes: e.target.value})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-medium outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white" placeholder="Ex: 120" />
                    <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1 font-semibold">⚠️ É fundamental definir o tempo para controle de entrega e alocação!</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Data Planejada</label>
                    <input type="date" value={formData.executionDeadline} onChange={e => setFormData({...formData, executionDeadline: e.target.value})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-medium outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Original (Detalhado)</label>
                  <input required type="text" value={formData.originalName} onChange={e => setFormData({...formData, originalName: e.target.value})} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 text-sm font-medium outline-none focus:border-teal-500 transition-all bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white" placeholder="Ex: Apuração PIS/COFINS Lucro Real" />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-5 py-3 text-sm font-extrabold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">Cancelar</button>
                  <button type="submit" disabled={submitting} className="w-full sm:w-auto px-6 py-3 text-sm font-extrabold text-white bg-teal-600 hover:bg-teal-700 rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20">
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
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm space-y-4">
          <Loader2 className="h-10 w-10 text-teal-500 animate-spin" />
          <p className="text-sm font-bold text-slate-500">Carregando matriz de conformidade...</p>
        </div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 dark:bg-slate-800 mb-6 shadow-inner">
            <CheckSquare className="h-8 w-8 text-teal-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Nenhuma entrega encontrada</h3>
          <p className="text-slate-500 font-medium mt-2 max-w-sm">
            Nenhuma obrigação corresponde ao filtro selecionado ou a base está vazia. Clique em "Executar Matriz Automática" para popular.
          </p>
        </div>
      ) : viewMode === 'KANBAN' ? (
        <div className="w-full h-[calc(100vh-280px)]">
          <DeliveryKanbanBoard 
            deliveries={filteredDeliveries} 
            onDeliveryClick={openTaskModal} 
            onStatusChange={handleKanbanStatusChange} 
            userRole={profile?.role}
            userId={profile?.id}
          />
        </div>
      ) : viewMode === 'ALLOCATION' ? (
        <div className="w-full h-[calc(100vh-280px)]">
          <DeliveryAllocationBoard 
            deliveries={filteredDeliveries}
            globalCapacity={globalCapacity}
            onDeliveryClick={openTaskModal}
            onAllocationChange={handleAllocationChange}
            onAutoSchedule={handleAutoSchedule}
            userRole={profile?.role}
          />
        </div>
      ) : (
        <>
          {/* Visualização em Cards para Mobile */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            <AnimatePresence>
              {filteredDeliveries.map((delivery) => (
                <motion.div
                  variants={rowVariants}
                  initial="hidden"
                  animate="show"
                  key={delivery.id}
                  onClick={() => openTaskModal(delivery)}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer space-y-4"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-50 dark:border-slate-800/80 pb-3">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
                      {delivery.competence}
                    </span>
                    <div>
                      {delivery.status === 'CONCLUIDA' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Concluída
                        </span>
                      )}
                      {delivery.status === 'ANDAMENTO' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                          <Clock className="w-3 h-3" /> Em Andamento
                        </span>
                      )}
                      {delivery.status === 'PREVISTA' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" /> Prevista
                        </span>
                      )}
                      {delivery.status === 'INATIVA' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Inativa
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                      {delivery.standardizedName}
                    </h4>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                      {delivery.originalName}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/50 text-xs">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate block mt-0.5">{delivery.client?.name || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Frente</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 truncate block mt-0.5">{delivery.front?.name || '-'}</span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800/60">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Responsável</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate block mt-0.5">{delivery.responsible?.name || '-'}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    {deleteConfirmId === delivery.id ? (
                      <div className="flex items-center justify-between w-full gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2" onClick={e => e.stopPropagation()}>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2">Excluir?</span>
                        <div className="flex gap-1">
                          <button onClick={(e) => handleDelete(delivery.id, e)} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors">Sim</button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors">Não</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 w-full">
                        {profile?.role !== 'OPERATOR' && (
                          <button onClick={(e) => handleOpenEditModal(delivery, e)} className="flex-1 text-center text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs bg-slate-100 dark:bg-slate-800 px-4 py-2.5 rounded-2xl transition-colors">Editar</button>
                        )}
                        {profile?.role !== 'OPERATOR' && (
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(delivery.id); }} className="flex-1 text-center text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 font-bold text-xs bg-slate-100 dark:bg-slate-800 px-4 py-2.5 rounded-2xl transition-colors">Excluir</button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Visualização em Tabela para Desktop (Monday Style) */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
            <table className="w-full text-left text-sm border-collapse table-fixed">
              <thead className="bg-slate-50/80 dark:bg-slate-950/50 text-slate-400 text-[11px] uppercase tracking-widest border-b border-slate-200/60 dark:border-slate-800/60">
                <tr>
                  <th className="px-4 py-3 font-bold w-[4%] text-center"></th>
                  <th className="px-4 py-3 font-bold w-[25%]">Tarefa / Obrigação</th>
                  <th className="px-4 py-3 font-bold w-[16%]">Cliente</th>
                  <th className="px-4 py-3 font-bold w-[12%] text-center">Frente</th>
                  <th className="px-4 py-3 font-bold w-[10%] text-center">Prioridade</th>
                  <th className="px-0 py-3 font-bold text-center w-[15%]">Status</th>
                  {profile?.role !== 'OPERATOR' && (
                    <th className="px-4 py-3 font-bold text-right w-[10%]">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {Object.entries(groupedDeliveries).map(([groupName, groupDeliveries]) => (
                    <React.Fragment key={groupName}>
                      {/* Group Header */}
                      <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200/60 dark:border-slate-800/60 group/header">
                        <td colSpan={7} className="px-4 py-2">
                          <div 
                            className="flex items-center gap-2 cursor-pointer w-max"
                            onClick={() => toggleGroup(groupName)}
                          >
                            <div className={`p-0.5 rounded-md text-slate-400 group-hover/header:bg-slate-200 dark:group-hover/header:bg-slate-700 transition-all ${collapsedGroups[groupName] ? '-rotate-90' : 'rotate-0'}`}>
                              <ChevronDown className="w-4 h-4" />
                            </div>
                            <span className="font-extrabold text-slate-700 dark:text-slate-300 group-hover/header:text-teal-600 transition-colors">{groupName}</span>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-200/50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md">
                              {groupDeliveries.length}
                            </span>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Group Rows */}
                      {!collapsedGroups[groupName] && groupDeliveries.map((delivery) => (
                        <motion.tr 
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          key={delivery.id} 
                          onClick={() => openTaskModal(delivery)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group/row border-b border-slate-100 dark:border-slate-800/40 last:border-0"
                        >
                          <td className="px-4 py-3 border-r border-slate-100 dark:border-slate-800/40 relative">
                            <div className="w-1 absolute left-0 top-2 bottom-2 rounded-r-md bg-transparent group-hover/row:bg-teal-500 transition-colors" />
                            <div className="flex items-center justify-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 dark:border-slate-800/40">
                            <p className="font-bold text-slate-900 dark:text-white line-clamp-2" title={delivery.standardizedName}>{delivery.standardizedName}</p>
                            <p className="text-[10px] font-medium text-slate-500 line-clamp-1" title={delivery.originalName}>
                              <span className="font-bold text-teal-600 dark:text-teal-400 mr-1">[{delivery.competence}]</span>
                              {delivery.originalName}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/40">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="line-clamp-2">{delivery.client?.name || '-'}</span>
                            {delivery.status === 'INATIVA' && (
                              <span className="ml-2 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700">Inativa</span>
                            )}
                            {delivery.status === 'ATRASADA' && (
                              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-500/20 text-[10px]">Atrasada</span>
                            )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-xs font-bold text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/40 truncate">
                            {delivery.front?.name || '-'}
                          </td>
                          <td className="px-4 py-3 text-center border-r border-slate-100 dark:border-slate-800/40">
                            <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider
                              ${delivery.priority === 'HIGH' ? 'bg-rose-500 text-white' : 
                                delivery.priority === 'LOW' ? 'bg-sky-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                            >
                              {delivery.priority === 'HIGH' ? 'Alta' : delivery.priority === 'LOW' ? 'Baixa' : 'Média'}
                            </span>
                          </td>
                          {/* Status Cell - Full Color Monday Style */}
                          <td className="px-0 py-0 border-r border-slate-100 dark:border-slate-800/40 p-0 m-0 align-middle">
                            <div className={`w-full h-full min-h-[48px] flex items-center justify-center text-[11px] font-black uppercase tracking-wider text-white transition-colors
                              ${delivery.status === 'CONCLUIDA' ? 'bg-emerald-500 hover:bg-emerald-600' : 
                                delivery.status === 'ANDAMENTO' ? 'bg-amber-500 hover:bg-amber-600' : 
                                delivery.status === 'ATRASADA' ? 'bg-rose-500 hover:bg-rose-600' : 
                                delivery.status === 'PREVISTA' ? 'bg-slate-400 hover:bg-slate-500 dark:bg-slate-600' : 'bg-slate-200 text-slate-500'}
                            `}>
                              {delivery.status === 'CONCLUIDA' ? 'Concluída' : delivery.status === 'ATRASADA' ? 'Atrasada' : delivery.status === 'ANDAMENTO' ? 'Em Andamento' : delivery.status === 'PREVISTA' ? 'Prevista' : 'Inativa'}
                            </div>
                          </td>
                          {profile?.role !== 'OPERATOR' && (
                            <td className="px-4 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {deleteConfirmId === delivery.id ? (
                                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1" onClick={e => e.stopPropagation()}>
                                    <button onClick={(e) => handleDelete(delivery.id, e)} className="rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-700">Sim</button>
                                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="rounded-md bg-white dark:bg-slate-700 px-2 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">Não</button>
                                  </div>
                                ) : (
                                  <>
                                    {delivery.status !== 'CONCLUIDA' && (
                                      <button onClick={(e) => handleQuickStatusChange(delivery.id, 'CONCLUIDA', e)} className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Marcar como Concluída">
                                        <CheckCircle2 className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(delivery.id); }} className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Excluir">
                                      <span className="sr-only">Excluir</span>
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </motion.tr>
                      ))}
                    </React.Fragment>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
