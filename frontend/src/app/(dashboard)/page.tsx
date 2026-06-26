'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  Target, 
  Activity, 
  Sparkles, 
  Calendar as CalendarIcon, 
  ArrowUpRight, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Briefcase,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { StatsCard } from '@/components/ui/StatsCard';

interface Client {
  id: string;
  name: string;
  cnpj: string | null;
  status: string;
  createdAt: string;
}

export default function DashboardHome() {
  const [userName, setUserName] = useState('admin');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 1)); // June 2026
  const [selectedDay, setSelectedDay] = useState<number | null>(1);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // Dynamic Metrics
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'ACTIVE').length;
  const inactiveClients = clients.filter(c => c.status === 'INACTIVE').length;
  const retentionRate = totalClients > 0 ? ((activeClients / totalClients) * 100).toFixed(1) : '100';

  // Sample tasks/schedules for the selected day in calendar
  const schedules: { [day: number]: { time: string; title: string; type: string }[] } = {
    1: [
      { time: '09:00', title: 'Integração de Novo Cliente', type: 'onboarding' },
      { time: '14:30', title: 'Alinhamento Estratégico', type: 'meeting' },
    ],
    2: [
      { time: '11:00', title: 'Revisão Trimestral de Metas', type: 'review' },
    ],
    5: [
      { time: '10:00', title: 'Workshop de Metodologias SASS', type: 'training' },
      { time: '16:00', title: 'Check-in Semanal', type: 'meeting' },
    ],
    10: [
      { time: '15:00', title: 'Apresentação de Resultados', type: 'meeting' },
    ],
    15: [
      { time: '09:30', title: 'Call de Sucesso do Cliente', type: 'meeting' },
      { time: '13:00', title: 'Setup de Banco de Dados Multi-tenant', type: 'onboarding' },
    ]
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Get user profile details
        const me = await apiRequest('/users/me');
        setUserName(me.name);

        if (me.role !== 'ADMIN') {
          // Consultores e Líderes não veem o dashboard superadmin
          router.replace(`/escritorios/${me.tenantId || me.tenant?.id}`);
          return;
        }

        // We cannot fetch clients globally without a tenantId. 
        // For the mockup dashboard, we'll fetch tenants and mock the client counts based on tenants
        const tenantsList = await apiRequest('/tenants');
        
        // Mocking clients data for the dashboard stats
        const mockClients = tenantsList.map((t: any) => ({
          id: t.id,
          name: t.name,
          cnpj: t.cnpj,
          status: t.status,
          createdAt: t.createdAt
        }));
        
        setClients(mockClients);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Erro ao sincronizar dados do painel.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Performance Chart Data (Last 6 Months Client growth)
  const chartData = [
    { month: 'Jan', value: 120, active: 110 },
    { month: 'Fev', value: 180, active: 165 },
    { month: 'Mar', value: 250, active: 220 },
    { month: 'Abr', value: 340, active: 310 },
    { month: 'Mai', value: 480, active: 450 },
    { month: 'Jun', value: totalClients > 0 ? totalClients * 8 : 650, active: activeClients > 0 ? activeClients * 8 : 610 }
  ];

  // Calendar rendering helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const startDayOfWeek = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDay(1);
  };

  const handleExportReport = () => {
    router.push('/relatorios');
  };


  const stats = [
    { name: 'Escritórios', value: activeClients, total: 'Contas Ativas', color: 'text-indigo-500', stripColor: 'bg-indigo-500', icon: Briefcase, progress: activeClients > 0 ? 100 : 0, desc: `${totalClients - activeClients} inativos no portal` },
    { name: 'Retenção', value: `${retentionRate}%`, total: 'Satisfação Geral', color: 'text-sky-500', stripColor: 'bg-sky-500', icon: Target, progress: Number(retentionRate) || 0, desc: 'Meta institucional: > 95%' },
    { name: 'Inativas', value: inactiveClients, total: 'Contas Arquivadas', color: 'text-rose-500', stripColor: 'bg-rose-500', icon: Activity, progress: totalClients > 0 ? (inactiveClients/totalClients)*100 : 0, desc: 'Aguardando intervenção' },
    { name: 'MRR', value: `R$ ${(activeClients * 2.49).toFixed(2)}k`, total: 'Faturamento', color: 'text-emerald-500', stripColor: 'bg-emerald-500', icon: TrendingUp, progress: 85, desc: 'Ticket Médio: R$ 2.49k' },
  ];


  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 25 } }
  };

  if (loading && clients.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div className="space-y-3">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            <div className="h-4 w-96 bg-slate-100 dark:bg-slate-800/50 rounded-lg"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            <div className="h-10 w-40 bg-teal-100 dark:bg-teal-900/30 rounded-full"></div>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded-md"></div>
                <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
              </div>
              <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg mt-4"></div>
            </div>
          ))}
        </div>

        {/* Graph/Table Area Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[400px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6">
            <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-md mb-6"></div>
            <div className="h-[300px] w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl"></div>
          </div>
          <div className="h-[400px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6">
             <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded-md mb-6"></div>
             <div className="space-y-4">
               {[1, 2, 3, 4, 5].map((i) => (
                 <div key={i} className="h-12 w-full bg-slate-50 dark:bg-slate-800/50 rounded-lg"></div>
               ))}
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 animate-in fade-in duration-500"
    >
      
      {/* 1. Integrated Welcome Banner - Premium Card Canvas */}
      <motion.div 
        variants={cardVariants}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-600 to-teal-900 p-8 sm:p-10 shadow-lg shadow-teal-900/10 border border-teal-500/20"
      >
        <div className="absolute right-0 top-0 -mt-24 -mr-24 h-80 w-80 rounded-full bg-white/10 blur-[80px] mix-blend-screen pointer-events-none"></div>
        <div className="absolute left-1/3 bottom-0 -mb-24 h-80 w-80 rounded-full bg-emerald-500/20 blur-[80px] mix-blend-screen pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1.5 text-xs font-bold text-teal-50 backdrop-blur-md mb-5 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Portal Multi-Tenant Ativo e Seguro
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight">
              Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-emerald-100">{userName.split(' ')[0]}</span> 👋
            </h2>
            <p className="mt-3 text-teal-50/80 text-sm sm:text-base font-medium max-w-xl leading-relaxed">
              Aqui está o panorama integrado da sua consultoria. Seus dados estão 100% isolados dinamicamente no seu respectivo schema de banco de dados.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row shrink-0 gap-3 w-full md:w-auto">
            <button 
              onClick={() => router.push('/configuracoes')}
              className="w-full sm:w-auto rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/10 transition-all active:scale-95 duration-200 shadow-sm"
            >
              Configurações
            </button>
            <button 
              onClick={handleExportReport}
              className="w-full sm:w-auto rounded-xl bg-white px-6 py-3.5 text-sm font-black text-teal-700 shadow-xl hover:bg-slate-50 transition-all active:scale-95 duration-200"
            >
              Exportar Relatório
            </button>
          </div>
        </div>
      </motion.div>

      {/* 2. Synced Metric Cards Grid - NEUMORPHIC STYLE */}
      <motion.div 
        variants={containerVariants}
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat, i) => (
          <StatsCard key={i} stat={stat as any} />
        ))}
      </motion.div>

      {/* 3. Core Workspace Dashboard - Layout similar to Pinterest reference */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        
        {/* LEFT & CENTER PANEL (Charts and Recent Activity) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Interactive Chart Container - NEUMORPHIC STYLE */}
          <motion.div 
            variants={cardVariants}
            className="rounded-[2.5rem] bg-indigo-600 p-8 shadow-[0_20px_50px_rgba(79,_70,_229,_0.3)] relative overflow-hidden text-white"
          >
            {/* Background glowing orbs */}
            <div className="absolute right-0 top-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-white/10 blur-[60px] pointer-events-none"></div>
            <div className="absolute left-0 bottom-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-[60px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-xl font-black tracking-tight text-white">Desempenho da Consultoria</h3>
                <p className="text-sm font-medium text-indigo-200 mt-1">Evolução de MRR e Contas Ativas (Semestre)</p>
              </div>
              <div className="flex bg-indigo-700/50 p-1.5 rounded-2xl backdrop-blur-sm border border-indigo-500/30 w-fit">
                 <button className="px-4 py-2 rounded-xl bg-white text-indigo-600 font-black text-xs shadow-sm">MRR Geral</button>
                 <button className="px-4 py-2 rounded-xl text-indigo-200 hover:text-white font-bold text-xs transition-colors">Contas</button>
              </div>
            </div>

            {/* Custom Interactive SVG Line Chart */}
            <div className="relative h-64 w-full rounded-2xl p-4 flex items-end overflow-x-auto custom-scrollbar">
              <div className="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none min-w-[400px]">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="w-full border-b border-indigo-400/20"></div>
                ))}
              </div>

              {/* Dynamic Bars with Hover Tooltips */}
              <div className="relative w-full min-w-[400px] h-48 flex items-end justify-between px-2 sm:px-6 z-10">
                {chartData.map((data, index) => {
                  const maxVal = Math.max(...chartData.map(d => d.value));
                  const percentageTotal = (data.value / maxVal) * 100;
                  const percentageActive = (data.active / maxVal) * 100;

                  return (
                    <div 
                      key={index}
                      className="flex flex-col items-center flex-1 group relative"
                      onMouseEnter={() => setHoveredBar(index)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {/* Tooltip Neumorphic */}
                      <AnimatePresence>
                        {hoveredBar === index && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: -20, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute bottom-full mb-2 bg-white text-slate-900 rounded-2xl p-3 shadow-2xl text-center z-30 flex flex-col items-center gap-1 border border-slate-100 min-w-[100px]"
                          >
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{data.month}</span>
                            <span className="text-sm font-black text-indigo-600">R$ {data.value}k</span>
                            <div className="h-3 w-3 rotate-45 bg-white border-r border-b border-slate-100 absolute -bottom-1.5 shadow-sm"></div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="relative w-10 sm:w-12 h-40 flex items-end justify-center gap-1 cursor-pointer">
                        {/* Rounded Bars */}
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${percentageTotal}%` }}
                          transition={{ duration: 1, delay: index * 0.1 }}
                          className="absolute w-6 sm:w-8 bg-indigo-500/40 group-hover:bg-indigo-400/60 rounded-xl transition-colors backdrop-blur-sm"
                        />
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${percentageActive}%` }}
                          transition={{ duration: 1, delay: index * 0.1 + 0.15 }}
                          className="absolute w-6 sm:w-8 bg-white rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.4)] group-hover:bg-indigo-50 transition-colors z-10"
                        />
                      </div>
                      <span className="text-xs font-bold text-indigo-200 mt-4 group-hover:text-white transition-colors">{data.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Dynamic Recent Clients Table - NEUMORPHIC STYLE */}
          <motion.div 
            variants={cardVariants}
            className="rounded-[2.5rem] bg-white dark:bg-slate-900 p-8 shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] dark:shadow-none border border-slate-50 dark:border-slate-800 relative overflow-hidden"
          >
            {/* Soft background shape */}
            <div className="absolute left-0 bottom-0 w-full h-32 bg-gradient-to-t from-slate-50 to-transparent dark:from-slate-800/30 pointer-events-none"></div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Escritórios Recentes</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Últimos setups realizados no portal</p>
              </div>
              <button 
                onClick={() => router.push('/escritorios')} 
                className="w-full sm:w-auto text-xs font-black text-slate-600 dark:text-slate-300 hover:text-slate-900 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 rounded-full transition-all hover:scale-105 active:scale-95 shadow-sm"
              >
                Visualizar Histórico
              </button>
            </div>

            <div className="space-y-4 relative z-10">
              {clients.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-400">Nenhuma atividade recente registrada.</p>
                </div>
              ) : (
                clients.slice(0, 4).map((client, i) => (
                  <div key={client.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-slate-200 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-0.5">
                    <div className="flex items-center gap-5">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center font-black text-slate-700 dark:text-slate-300 text-lg shadow-inner group-hover:shadow-md transition-shadow shrink-0">
                        {client.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-black text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 transition-colors truncate">{client.name}</p>
                        <p className="text-xs font-bold text-slate-400 mt-0.5 truncate">{client.cnpj || `Setup há ${i + 1} dia(s)`}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-[11px] font-black shadow-sm w-full sm:w-auto ${
                      client.status === 'ACTIVE' 
                        ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {client.status === 'ACTIVE' ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* RIGHT PANEL - Mini Interactive Calendar Widget NEUMORPHIC */}
        <motion.div 
          variants={cardVariants}
          className="lg:col-span-1 space-y-8"
        >
          {/* Calendar Widget Card */}
          <div className="rounded-[2.5rem] bg-white dark:bg-slate-900 p-8 shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] dark:shadow-none border border-slate-50 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Agendas
              </h3>
              <div className="flex items-center justify-between gap-1 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner w-full sm:w-auto">
                <button 
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm text-slate-500 transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-[11px] font-black uppercase px-2 text-slate-700 dark:text-slate-300 truncate">
                  {monthNames[currentDate.getMonth()].substring(0, 3)} {currentDate.getFullYear()}
                </div>
                <button 
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm text-slate-500 transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Grid calendar */}
            <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black text-slate-400 mb-4">
              <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
            </div>
            
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold">
              {/* Empty days before start day */}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="p-2"></div>
              ))}
              
              {/* Actual days in month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const hasSchedule = !!schedules[day];
                const isSelected = selectedDay === day;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`relative aspect-square flex items-center justify-center rounded-2xl text-sm font-black transition-all ${
                      isSelected 
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl scale-110 z-10' 
                        : hasSchedule
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {day}
                    {hasSchedule && !isSelected && (
                      <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-indigo-500"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected day task schedules list */}
            <div className="mt-8">
              <div className="flex items-center gap-3 mb-6">
                 <div className="h-px bg-slate-100 flex-1"></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                   Dia {selectedDay}
                 </span>
                 <div className="h-px bg-slate-100 flex-1"></div>
              </div>
              
              <div className="space-y-4">
                {selectedDay && schedules[selectedDay] ? (
                  schedules[selectedDay].map((task, i) => (
                    <div key={i} className="flex gap-4 p-5 rounded-[2rem] bg-white border border-slate-100 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all">
                      <div className="flex flex-col items-center justify-center bg-slate-50 px-3 py-2 rounded-2xl border border-slate-100">
                        <span className="text-xs font-black text-slate-900 leading-none">{task.time.split(':')[0]}</span>
                        <span className="text-[9px] font-bold text-slate-400">{task.time.split(':')[1]}</span>
                      </div>
                      <div className="flex flex-col justify-center">
                        <p className="text-sm font-black text-slate-900 leading-tight">{task.title}</p>
                        <span className="text-[10px] font-bold text-indigo-500 capitalize mt-1 tracking-wide">{task.type}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                    <p className="text-xs font-bold text-slate-400">Tempo livre. Sem compromissos.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </motion.div>

      </div>

    </motion.div>
  );
}
