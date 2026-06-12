'use client';

import React, { useState, useEffect, use } from 'react';
import { Loader2, TrendingUp, Users, DollarSign, Activity, PieChart as PieChartIcon, BarChart2, Users2 } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

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

  const KpiCard = ({ title, value, icon: Icon, delay, subtitle, colorClass }: any) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-start gap-4 relative overflow-hidden">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 mt-1">{value}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Fileira de KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KpiCard 
          title="Receita do Ciclo" 
          value={formatCurrency(totalRevenue)} 
          icon={DollarSign} 
          delay={0.1} 
          colorClass="bg-emerald-50 text-emerald-600"
          subtitle={`${clientsCount} clientes ativos`}
        />
        <KpiCard 
          title="Custo Operacional (Folha)" 
          value={formatCurrency(totalPersonnelCost)} 
          icon={Activity} 
          delay={0.2} 
          colorClass="bg-rose-50 text-rose-600"
          subtitle={`${teamCount} colaboradores alocados`}
        />
        <KpiCard 
          title="Margem de Contribuição" 
          value={formatCurrency(contributionMargin)} 
          icon={TrendingUp} 
          delay={0.3} 
          colorClass="bg-teal-50 text-teal-600"
          subtitle="Receita - Custo Operacional"
        />
        <KpiCard 
          title="Eficiência Operacional" 
          value={`${kpiPersonnelCostPercent.toFixed(1)}%`} 
          icon={PieChartIcon} 
          delay={0.4} 
          colorClass={kpiPersonnelCostPercent > 50 ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}
          subtitle="Comprometimento da Receita"
        />
      </div>

      {/* Fileira de KPIs Secundários */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard 
          title="Ticket Médio" 
          value={formatCurrency(avgTicket)} 
          icon={DollarSign} 
          delay={0.5} 
          colorClass="bg-indigo-50 text-indigo-600"
          subtitle="Receita / Clientes"
        />
        <KpiCard 
          title="Custo Médio por Colaborador" 
          value={formatCurrency(avgCostPerEmployee)} 
          icon={Users} 
          delay={0.6} 
          colorClass="bg-slate-50 text-slate-600"
          subtitle="Custo / Colaboradores"
        />
        <KpiCard 
          title="Clientes / Colaborador" 
          value={`${clientsPerEmployee.toFixed(1)}`} 
          icon={Users2} 
          delay={0.7} 
          colorClass="bg-violet-50 text-violet-600"
          subtitle="Proporção da carteira"
        />
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
                    formatter={(value: number) => [`${value} clientes`, 'Quantidade']}
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
                    formatter={(value: number) => [`${value} clientes`, 'Quantidade']}
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
                    formatter={(value: number) => [`${value} clientes`, 'Quantidade']}
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
