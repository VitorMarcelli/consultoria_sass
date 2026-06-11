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
    { name: 'Escritórios Ativos', value: activeClients, total: totalClients, color: 'text-teal-600 bg-teal-50 border-teal-100', icon: Users, desc: 'Isolados no schema' },
    { name: 'Taxa de Retenção', value: `${retentionRate}%`, total: 'Meta > 95%', color: 'text-emerald-500 bg-emerald-50 border-emerald-100', icon: Target, desc: 'Satisfação geral' },
    { name: 'Contas Inativas', value: inactiveClients, total: 'Arquivados', color: 'text-slate-500 bg-slate-50 border-slate-200', icon: Clock, desc: 'Sem pendências' },
    { name: 'MRR Estimado', value: `R$ ${(activeClients * 2490).toLocaleString('pt-BR')}`, total: 'R$ 2.49k / cliente', color: 'text-blue-500 bg-blue-50 border-blue-100', icon: TrendingUp, desc: 'Faturamento recorrente' },
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
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Loader2 className="h-10 w-10 text-teal-600 animate-spin" />
        <p className="text-slate-500 font-bold text-sm tracking-wide">Sincronizando painel corporativo em tempo real...</p>
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
          <div className="flex shrink-0 gap-3">
            <button 
              onClick={() => router.push('/configuracoes')}
              className="rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/10 transition-all active:scale-95 duration-200 shadow-sm"
            >
              Configurações
            </button>
            <button 
              onClick={handleExportReport}
              className="rounded-xl bg-white px-6 py-3.5 text-sm font-black text-teal-700 shadow-xl hover:bg-slate-50 transition-all active:scale-95 duration-200"
            >
              Exportar Relatório
            </button>
          </div>
        </div>
      </motion.div>

      {/* 2. Synced Metric Cards Grid */}
      <motion.div 
        variants={containerVariants}
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat, i) => (
          <motion.div 
            key={i} 
            variants={cardVariants}
            className="rounded-[2rem] border border-slate-100 bg-white p-7 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.color} transition-transform duration-300 group-hover:scale-105`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold tracking-wide text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
                {stat.total}
              </span>
            </div>
            <div className="mt-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{stat.name}</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{stat.value}</h3>
              <p className="text-sm font-medium text-slate-500 mt-2">{stat.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* 3. Core Workspace Dashboard - Layout similar to Pinterest reference */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        
        {/* LEFT & CENTER PANEL (Charts and Recent Activity) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Interactive Chart Container */}
          <motion.div 
            variants={cardVariants}
            className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm relative"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Desempenho da Consultoria</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Evolução do faturamento e clientes ativos no semestre</p>
              </div>
              <div className="flex gap-3 text-xs font-bold">
                <span className="flex items-center gap-2 bg-teal-50 border border-teal-100 text-teal-700 px-3.5 py-2 rounded-xl">
                  <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                  Geral
                </span>
                <span className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3.5 py-2 rounded-xl">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  Ativos
                </span>
              </div>
            </div>

            {/* Custom Interactive SVG Line Chart */}
            <div className="relative h-64 w-full bg-slate-50/50 rounded-2xl border border-slate-100 p-4 flex items-end">
              <div className="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="w-full border-b border-slate-200/50"></div>
                ))}
              </div>

              {/* Dynamic Bars with Hover Tooltips */}
              <div className="relative w-full h-48 flex items-end justify-between px-4 z-10">
                {chartData.map((data, index) => {
                  const maxVal = Math.max(...chartData.map(d => d.value));
                  const percentageTotal = (data.value / maxVal) * 100;
                  const percentageActive = (data.active / maxVal) * 100;

                  return (
                    <div 
                      key={index}
                      className="flex flex-col items-center flex-1 group"
                      onMouseEnter={() => setHoveredBar(index)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {/* Tooltip */}
                      <AnimatePresence>
                        {hoveredBar === index && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: -45 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute bg-slate-900 text-white rounded-xl p-3 shadow-xl text-center z-30 flex flex-col items-center gap-1 border border-slate-800"
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{data.month}</span>
                            <span className="text-xs font-black text-teal-400">Total: {data.value}</span>
                            <span className="text-xs font-black text-emerald-400">Ativos: {data.active}</span>
                            <div className="h-2 w-2 rotate-45 bg-slate-900 absolute -bottom-1"></div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="relative w-8 h-40 flex items-end gap-1 cursor-pointer">
                        {/* Total Clients Bar */}
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${percentageTotal}%` }}
                          transition={{ duration: 1, delay: index * 0.1 }}
                          className="w-3.5 bg-teal-500/20 group-hover:bg-teal-500/40 rounded-t-md transition-colors"
                        />
                        {/* Active Clients Bar */}
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${percentageActive}%` }}
                          transition={{ duration: 1, delay: index * 0.1 + 0.15 }}
                          className="w-3.5 bg-emerald-400 rounded-t-md shadow-xs shadow-emerald-500/10 group-hover:bg-emerald-500 transition-colors"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 mt-2">{data.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Dynamic Recent Clients Table */}
          <motion.div 
            variants={cardVariants}
            className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Atividades Recentes</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Últimos escritórios integrados no seu portal</p>
              </div>
              <button 
                onClick={() => router.push('/escritorios')} 
                className="text-sm font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100/70 border border-teal-100/50 px-4 py-2 rounded-xl transition-all"
              >
                Gerenciar Escritórios
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {clients.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-sm font-semibold text-slate-400">Nenhuma atividade recente registrada.</p>
                </div>
              ) : (
                clients.slice(0, 4).map((client, i) => (
                  <div key={client.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-teal-100/60 hover:bg-teal-50/20 transition-all hover:shadow-sm cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center font-black text-teal-600 text-sm shadow-sm">
                        {client.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-900 tracking-tight">{client.name}</p>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">Cadastrado há {i + 1} dia(s)</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                      client.status === 'ACTIVE' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {client.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* RIGHT PANEL - Mini Interactive Calendar Widget */}
        <motion.div 
          variants={cardVariants}
          className="lg:col-span-1 space-y-8"
        >
          {/* Calendar Widget Card */}
          <div className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <CalendarIcon className="h-5 w-5 text-teal-600" />
                Agendas & Reuniões
              </h3>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg hover:bg-slate-50 border border-slate-200 text-slate-500"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button 
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg hover:bg-slate-50 border border-slate-200 text-slate-500"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Current Month Banner */}
            <div className="text-sm font-black text-slate-900 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 flex items-center justify-between mb-4">
              <span>{monthNames[currentDate.getMonth()]}</span>
              <span className="text-slate-400">{currentDate.getFullYear()}</span>
            </div>

            {/* Grid calendar */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 mb-2">
              <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
            </div>
            
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold">
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
                    className={`relative p-2.5 rounded-xl text-sm font-bold transition-all ${
                      isSelected 
                        ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20' 
                        : hasSchedule
                          ? 'bg-teal-50 text-teal-700 border border-teal-100/50 hover:bg-teal-100/50'
                          : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {day}
                    {hasSchedule && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-teal-500"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected day task schedules list */}
            <div className="mt-8 border-t border-slate-100 pt-8">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-5">
                Compromissos para Dia {selectedDay}
              </h4>
              
              <div className="space-y-4">
                {selectedDay && schedules[selectedDay] ? (
                  schedules[selectedDay].map((task, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-teal-100 transition-colors">
                      <span className="text-sm font-black text-teal-600 shrink-0 mt-0.5">{task.time}</span>
                      <div>
                        <p className="text-xs font-black text-slate-900 leading-normal">{task.title}</p>
                        <p className="text-[10px] font-bold text-slate-400 capitalize mt-0.5">{task.type}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-100">
                    <p className="text-xs font-bold text-slate-400">Nenhum compromisso agendado para esta data.</p>
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
