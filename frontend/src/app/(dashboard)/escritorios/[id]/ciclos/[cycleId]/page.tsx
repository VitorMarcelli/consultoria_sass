'use client';

import React, { useState, useEffect, use } from 'react';
import { Loader2, TrendingUp, Users, DollarSign, Activity, PieChart as PieChartIcon, BarChart2, Users2 } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { StatsCard } from '@/components/ui/StatsCard';

const COLORS = ['#0d9488', '#f43f5e', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#64748b'];

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

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [currentGoal, setCurrentGoal] = useState(goal);
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    if (goal) setCurrentGoal(goal);
  }, [goal]);

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
    { name: 'Clientes / Colab', value: clientsPerEmployee.toFixed(1), total: 'Carteira', color: 'text-violet-500', stripColor: 'bg-violet-500', icon: Users2, progress: 100, desc: 'Proporção' },
  ];

  const progressPercent = totalEstimatedMinutes > 0 ? Math.round((completedEstimatedMinutes / totalEstimatedMinutes) * 100) : 0;
  const taskProgressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      
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
    </div>
  );
}
