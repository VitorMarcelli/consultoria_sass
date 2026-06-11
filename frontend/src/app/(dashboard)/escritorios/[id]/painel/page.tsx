'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, TrendingUp, Users, DollarSign, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export default function PainelGerencialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    async function init() {
      try {
        const cyclesData = await apiRequest(`/management-cycles?tenantId=${id}`);
        setCycles(cyclesData || []);
        if (cyclesData && cyclesData.length > 0) {
          setSelectedCycleId(cyclesData[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id]);

  useEffect(() => {
    if (selectedCycleId) {
      loadStats(selectedCycleId);
    }
  }, [selectedCycleId]);

  const loadStats = async (cycleId: string) => {
    try {
      const data = await apiRequest(`/management-cycles/${cycleId}/dashboard?tenantId=${id}`);
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-[60vh]"><Loader2 className="w-10 h-10 animate-spin text-teal-600" /></div>;
  }

  // Prepara dados para os gráficos
  const pieData = stats ? Object.entries(stats.distributionByTaxRegime || {}).map(([name, value]) => ({ name, value })) : [];
  
  // Bar Chart Data (Receita x Custo)
  const barData = stats ? [
    { name: 'Financeiro', Receita: stats.totalRevenue, Custo: stats.totalPersonnelCost }
  ] : [];

  return (
    <div className="bg-slate-50 min-h-[80vh] rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-inner relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10"
      >
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-teal-600" />
            Painel Gerencial
          </h2>
          <p className="text-slate-500 font-medium mt-2 text-lg">Visão estratégica e indicadores de performance.</p>
        </div>
        
        {cycles.length > 0 && (
          <div className="bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-white shadow-sm flex items-center">
            <span className="text-sm font-bold text-slate-500 px-3 uppercase tracking-wider">Ciclo</span>
            <select 
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-teal-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {cycles.map(c => (
                <option key={c.id} value={c.id}>
                  {String(c.month).padStart(2, '0')}/{c.year}
                </option>
              ))}
            </select>
          </div>
        )}
      </motion.div>

      {!stats ? (
        <div className="text-center py-20 text-slate-500 bg-white/50 backdrop-blur-md rounded-3xl border border-white shadow-sm">
          Selecione um ciclo para ver os dados. Se não houver ciclos, crie um na aba Gestão de Ciclos.
        </div>
      ) : (
        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="show" 
          className="space-y-8 relative z-10"
        >
          {/* Main KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-500/30">
                  <DollarSign className="w-6 h-6" />
                </div>
                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">Entradas</span>
              </div>
              <h3 className="font-semibold text-slate-500 text-sm uppercase tracking-wider mb-1">Receita Total do Ciclo</h3>
              <p className="text-4xl font-black text-slate-900 tracking-tight">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.totalRevenue)}
              </p>
            </motion.div>
            
            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-rose-400 to-red-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-500/30">
                  <Users className="w-6 h-6" />
                </div>
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">Saídas</span>
              </div>
              <h3 className="font-semibold text-slate-500 text-sm uppercase tracking-wider mb-1">Custo c/ Pessoal Ativo</h3>
              <p className="text-4xl font-black text-slate-900 tracking-tight">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.totalPersonnelCost)}
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/20 rounded-full blur-2xl"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-teal-400 backdrop-blur-md border border-white/10">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">Eficiência</span>
              </div>
              <h3 className="font-semibold text-slate-400 text-sm uppercase tracking-wider mb-1 relative z-10">Gasto com Pessoal (%)</h3>
              <p className="text-4xl font-black text-white tracking-tight relative z-10">
                {stats.kpiPersonnelCostPercent.toFixed(1)}<span className="text-2xl text-slate-400">%</span>
              </p>
              
              {/* Progress bar visual */}
              <div className="w-full bg-slate-800 h-2 rounded-full mt-4 relative z-10 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(stats.kpiPersonnelCostPercent, 100)}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className={`h-full rounded-full ${stats.kpiPersonnelCostPercent > 60 ? 'bg-red-500' : stats.kpiPersonnelCostPercent > 40 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                />
              </div>
            </motion.div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
            {/* Pie Chart */}
            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-sm flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                  <PieChartIcon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-slate-900">Regime Tributário</h3>
              </div>
              <div className="flex-1 w-full relative">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontWeight: 'bold' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-medium">
                    Sem dados suficientes
                  </div>
                )}
              </div>
            </motion.div>

            {/* Bar Chart */}
            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-sm flex flex-col h-full min-w-0">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-slate-900">Receita vs Custo (Geral)</h3>
              </div>
              <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      width={80}
                      tickFormatter={(value) => value >= 1000 ? `R$${(value / 1000).toFixed(0)}k` : `R$${value}`}
                    />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="Receita" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={60} />
                    <Bar dataKey="Custo" fill="#f43f5e" radius={[8, 8, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
