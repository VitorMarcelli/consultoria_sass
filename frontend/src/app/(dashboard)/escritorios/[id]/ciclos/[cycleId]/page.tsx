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
    distributionByFrequency = {}
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
    { name: 'Clientes / Colab', value: clientsPerEmployee.toFixed(1), total: 'Carteira', color: 'text-violet-500', stripColor: 'bg-violet-500', icon: Users2, progress: 100, desc: 'Proporção' },
  ];

  return (
    <div className="space-y-6 pb-12">
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
