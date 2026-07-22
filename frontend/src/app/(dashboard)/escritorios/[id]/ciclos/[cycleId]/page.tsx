'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { Loader2, TrendingUp, Users, DollarSign, Activity, PieChart as PieChartIcon, BarChart2, Users2, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { StatsCard } from '@/components/ui/StatsCard';
import DashboardMappingTab from './components/DashboardMappingTab';
import DashboardCapacityTab from './components/DashboardCapacityTab';
import DashboardLevelingTab from './components/DashboardLevelingTab';

const COLORS = ['#0d9488', '#f43f5e', '#3b82f6', '#f59e0b', '#14B8A6', '#10b981', '#64748b'];

export default function CycleOverviewPage({
  params,
}: {
  params: Promise<{ id: string; cycleId: string }>;
}) {
  const { id, cycleId } = use(params);
  const searchParams = useSearchParams();
  const frontId = searchParams.get('frontId') || '';
  const subdivisionId = searchParams.get('subdivisionId') || '';
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [currentGoal, setCurrentGoal] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  // Seletor de frente compartilhado pelas 3 seções operacionais abaixo
  // (Diagnóstico, Capacidade, Nivelamento) — antes cada uma tinha o próprio
  // seletor duplicado; agora é um só, controlando as três ao mesmo tempo.
  const [fronts, setFronts] = useState<any[]>([]);
  const [activeFrontId, setActiveFrontId] = useState('');

  // Seções recolhidas por padrão (a página já é longa) — o card de alerta
  // abre e leva direto para a Capacidade quando há gente sobrecarregada.
  const [expandedSections, setExpandedSections] = useState({ mapping: false, capacity: false, leveling: false });
  const toggleSection = (key: 'mapping' | 'capacity' | 'leveling') =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  const capacitySectionRef = useRef<HTMLDivElement>(null);

  // Capacidade agregada de todas as frentes, só para o card de alerta no
  // topo — independente da frente selecionada nas 3 seções abaixo.
  const [globalCapacity, setGlobalCapacity] = useState<any[]>([]);

  useEffect(() => {
    apiRequest(`/structures/fronts?tenantId=${id}`)
      .then((data: any[]) => {
        setFronts(data || []);
        if (data && data.length > 0) setActiveFrontId(data[0].id);
      })
      .catch(() => setFronts([]));

    apiRequest(`/dashboard/capacity/${cycleId}/all?tenantId=${id}`)
      .then((res: any) => setGlobalCapacity(res?.capacityData || []))
      .catch(() => setGlobalCapacity([]));
  }, [id, cycleId]);

  const overloadedEmployees = globalCapacity.filter((c: any) => c.status === 'OVERLOADED');
  const idleEmployees = globalCapacity.filter((c: any) => c.status === 'IDLE');

  const goToCapacity = () => {
    setExpandedSections(prev => ({ ...prev, capacity: true }));
    setTimeout(() => capacitySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        let url = `/management-cycles/${cycleId}/dashboard?tenantId=${id}`;
        if (frontId) url += `&frontId=${frontId}`;
        if (subdivisionId) url += `&subdivisionId=${subdivisionId}`;
        
        const data = await apiRequest(url);
        setStats(data);
      } catch (err) {
        console.error('Erro ao carregar estatísticas do ciclo', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [id, cycleId, frontId, subdivisionId]);

  useEffect(() => {
    if (stats?.goal) {
      setCurrentGoal(stats.goal);
    }
  }, [stats?.goal]);

  const handleSaveGoal = async () => {
    try {
      setSavingGoal(true);
      await apiRequest(`/management-cycles/${cycleId}?tenantId=${id}`, {
        method: 'PUT',
        body: JSON.stringify({ goal: currentGoal })
      });
      setIsEditingGoal(false);
      // Reload stats is not strictly necessary, we updated local state
    } catch (err) {
      console.error('Erro ao salvar meta', err);
    } finally {
      setSavingGoal(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center py-32"><Loader2 className="w-10 h-10 animate-spin text-teal-600" /></div>;
  }

  const {
    totalRevenue = 0,
    totalPersonnelCost = 0,
    kpiPersonnelCostPercent = 0,
    clientsCount = 0,
    teamCount = 0,
    distributionByTaxRegime = {},
    distributionByComplexity = {},
    distributionByFrequency = {},
    goal = '',
    totalTasks = 0,
    completedTasks = 0,
    totalEstimatedMinutes = 0,
    completedEstimatedMinutes = 0,
  } = stats || {};

  const contributionMargin = totalRevenue - totalPersonnelCost;
  const avgTicket = clientsCount > 0 ? totalRevenue / clientsCount : 0;
  const avgCostPerEmployee = teamCount > 0 ? totalPersonnelCost / teamCount : 0;
  const clientsPerEmployee = teamCount > 0 ? clientsCount / teamCount : 0;

  // Format data for charts
  const regimeData = Object.keys(distributionByTaxRegime).map(key => ({
    name: key,
    value: distributionByTaxRegime[key]
  })).sort((a, b) => b.value - a.value);

  const complexityData = Object.keys(distributionByComplexity).map(key => ({
    name: key,
    value: distributionByComplexity[key]
  })).sort((a, b) => a.name.localeCompare(b.name));

  const frequencyData = Object.keys(distributionByFrequency).map(key => ({
    name: key,
    value: distributionByFrequency[key]
  })).sort((a, b) => b.value - a.value);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const cycleStats = [
    { name: 'Receita do Ciclo', value: formatCurrency(totalRevenue), total: `${clientsCount} clientes`, color: 'text-emerald-500', stripColor: 'bg-emerald-500', icon: DollarSign, progress: 100, desc: 'Entradas' },
    { name: 'Custo Operacional', value: formatCurrency(totalPersonnelCost), total: `${teamCount} alocados`, color: 'text-rose-500', stripColor: 'bg-rose-500', icon: Activity, progress: totalRevenue > 0 ? (totalPersonnelCost/totalRevenue)*100 : 0, desc: 'Folha' },
    { name: 'Margem Contrib.', value: formatCurrency(contributionMargin), total: 'Receita - Custo', color: 'text-teal-500', stripColor: 'bg-teal-500', icon: TrendingUp, progress: totalRevenue > 0 ? (contributionMargin/totalRevenue)*100 : 0, desc: 'Lucro do Ciclo' },
    { name: 'Eficiência Op.', value: `${kpiPersonnelCostPercent.toFixed(1)}%`, total: 'Custo / Receita', color: kpiPersonnelCostPercent > 50 ? 'text-amber-500' : 'text-blue-500', stripColor: kpiPersonnelCostPercent > 50 ? 'bg-amber-500' : 'bg-blue-500', icon: PieChartIcon, progress: kpiPersonnelCostPercent, desc: 'Comprometimento' },
  ];

  const secondaryStats = [
    { name: 'Ticket Médio', value: formatCurrency(avgTicket), total: 'Receita / Clientes', color: 'text-indigo-500', stripColor: 'bg-indigo-500', icon: DollarSign, progress: 100, desc: 'Por Cliente' },
    { name: 'Custo Médio/Colab', value: formatCurrency(avgCostPerEmployee), total: 'Custo / Colab', color: 'text-slate-500', stripColor: 'bg-slate-500', icon: Users, progress: 100, desc: 'Por Funcionário' },
    { name: 'Clientes / Colab', value: clientsPerEmployee.toFixed(1), total: 'Carteira', color: 'text-teal-500', stripColor: 'bg-teal-500', icon: Users2, progress: 100, desc: 'Proporção' },
  ];

  const progressPercent = totalEstimatedMinutes > 0 ? Math.round((completedEstimatedMinutes / totalEstimatedMinutes) * 100) : 0;
  const taskProgressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">

      {/* Alerta de Carga — o problema mais urgente, visível sem rolar nem clicar */}
      {overloadedEmployees.length > 0 ? (
        <motion.button
          onClick={goToCapacity}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex items-center justify-between gap-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-3xl p-5 text-left hover:bg-rose-100/70 dark:hover:bg-rose-500/15 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-rose-700 dark:text-rose-400">
                {overloadedEmployees.length === 1
                  ? '1 colaborador sobrecarregado neste ciclo'
                  : `${overloadedEmployees.length} colaboradores sobrecarregados neste ciclo`}
              </p>
              <p className="text-xs font-medium text-rose-600/80 dark:text-rose-400/70 mt-0.5">
                {overloadedEmployees.slice(0, 3).map((e: any) => e.employee).join(', ')}
                {overloadedEmployees.length > 3 ? ` e mais ${overloadedEmployees.length - 3}` : ''} — acima da capacidade estimada.
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider whitespace-nowrap shrink-0">Ver detalhes →</span>
        </motion.button>
      ) : globalCapacity.length > 0 ? (
        <motion.button
          onClick={goToCapacity}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex items-center justify-between gap-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-3xl p-5 text-left hover:bg-emerald-100/70 dark:hover:bg-emerald-500/15 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">Equipe equilibrada neste ciclo</p>
              <p className="text-xs font-medium text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">
                Nenhum colaborador acima da capacidade estimada
                {idleEmployees.length > 0 ? ` — ${idleEmployees.length} com folga para receber mais carteira.` : '.'}
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider whitespace-nowrap shrink-0">Ver detalhes →</span>
        </motion.button>
      ) : null}

      {/* Metas e Progresso do Ciclo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meta do Ciclo */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              Metas do Sprint (Ciclo)
            </h3>
            {!isEditingGoal && (
              <button 
                onClick={() => setIsEditingGoal(true)}
                className="text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Editar
              </button>
            )}
          </div>

          {isEditingGoal ? (
            <div className="flex flex-col gap-3 flex-1 justify-center">
              <textarea 
                value={currentGoal}
                onChange={e => setCurrentGoal(e.target.value)}
                placeholder="Ex: Garantir fechamento de folha sem multas e concluir onboarding de 3 novos clientes..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none h-24"
              />
              <div className="flex items-center justify-end gap-2">
                <button 
                  onClick={() => setIsEditingGoal(false)}
                  disabled={savingGoal}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveGoal}
                  disabled={savingGoal}
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  {savingGoal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar Meta'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center">
              {currentGoal ? (
                <p className="text-lg sm:text-xl font-black text-slate-800 leading-snug">
                  "{currentGoal}"
                </p>
              ) : (
                <p className="text-sm font-medium text-slate-400 italic">
                  Nenhuma meta definida para este ciclo. Adicione um objetivo para guiar o time!
                </p>
              )}
            </div>
          )}
        </div>

        {/* Barra de Progresso Macro */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              Progresso do Ciclo
            </h3>
            <span className="text-2xl font-black text-indigo-600">{progressPercent}%</span>
          </div>

          <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden mb-6">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full"
            />
          </div>

          <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase">Esforço (Horas)</span>
              <span className="text-sm font-black text-slate-700">{Math.round(completedEstimatedMinutes/60)}h / {Math.round(totalEstimatedMinutes/60)}h</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-slate-400 uppercase">Tarefas</span>
              <span className="text-sm font-black text-slate-700">{completedTasks} / {totalTasks} ({taskProgressPercent}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fileira de KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {cycleStats.map((stat, i) => (
          <StatsCard key={i} stat={stat as any} />
        ))}
      </div>

      {/* Fileira de KPIs Secundários */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {secondaryStats.map((stat, i) => (
          <StatsCard key={i} stat={stat as any} />
        ))}
      </div>

      {/* Sessão de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Regime Tributário */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-slate-400" /> Distribuição por Regime
          </h3>
          <div className="flex-1 min-h-[250px]">
            {regimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={regimeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {regimeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: any) => [`${value} clientes`, 'Quantidade']}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">Sem dados</div>
            )}
          </div>
        </motion.div>

        {/* Nível de Complexidade */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-400" /> Nível de Complexidade
          </h3>
          <div className="flex-1 min-h-[250px]">
            {complexityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complexityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(value: any) => [`${value} clientes`, 'Quantidade']}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#0d9488" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">Sem dados</div>
            )}
          </div>
        </motion.div>

        {/* Frequência de Trabalho */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-400" /> Frequência de Trabalho
          </h3>
          <div className="flex-1 min-h-[250px]">
            {frequencyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={frequencyData} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={80} />
                  <RechartsTooltip 
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(value: any) => [`${value} clientes`, 'Quantidade']}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} maxBarSize={30}>
                    {frequencyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">Sem dados</div>
            )}
          </div>
        </motion.div>

      </div>

      {/* Leitura Operacional (Diagnóstico, Capacidade, Nivelamento) */}
      {fronts.length > 0 && (
        <div className="pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Leitura Operacional</h2>
              <p className="text-sm text-slate-500 mt-1">Raio-X da carteira, capacidade da equipe e nivelamento diário — por frente.</p>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-max">
              {fronts.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFrontId(f.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    activeFrontId === f.id
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <AccordionSection
              title="Diagnóstico"
              subtitle="Raio-X da carteira: status, tributação, segmento e complexidade"
              expanded={expandedSections.mapping}
              onToggle={() => toggleSection('mapping')}
            >
              <DashboardMappingTab tenantId={id} cycleId={cycleId} activeFrontId={activeFrontId} />
            </AccordionSection>

            <AccordionSection
              title="Capacidade"
              subtitle="Quem está sobrecarregado ou ocioso na frente selecionada"
              expanded={expandedSections.capacity}
              onToggle={() => toggleSection('capacity')}
              sectionRef={capacitySectionRef}
              highlight={overloadedEmployees.length > 0}
            >
              <DashboardCapacityTab tenantId={id} cycleId={cycleId} activeFrontId={activeFrontId} />
            </AccordionSection>

            <AccordionSection
              title="Nivelamento"
              subtitle="Heijunka diário: evita concentração de entregas no dia do vencimento"
              expanded={expandedSections.leveling}
              onToggle={() => toggleSection('leveling')}
            >
              <DashboardLevelingTab tenantId={id} cycleId={cycleId} activeFrontId={activeFrontId} />
            </AccordionSection>
          </div>
        </div>
      )}
    </div>
  );
}

function AccordionSection({
  title,
  subtitle,
  expanded,
  onToggle,
  children,
  sectionRef,
  highlight,
}: {
  title: string;
  subtitle: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
  highlight?: boolean;
}) {
  return (
    <div
      ref={sectionRef}
      className={`bg-white dark:bg-slate-900 rounded-3xl border shadow-sm overflow-hidden scroll-mt-6 transition-colors ${
        highlight ? 'border-rose-300 dark:border-rose-500/40' : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {highlight && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">{title}</h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
