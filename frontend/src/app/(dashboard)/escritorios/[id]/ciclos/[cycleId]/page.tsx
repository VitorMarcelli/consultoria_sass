'use client';

import React, { useState, useEffect, use } from 'react';
import { Loader2, TrendingUp, Users, DollarSign, Activity } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { motion } from 'framer-motion';

import { useSearchParams } from 'next/navigation';

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-start gap-4 relative overflow-hidden">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0"><DollarSign className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Receita do Ciclo</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats?.totalRevenue || 0)}
            </h3>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-start gap-4 relative overflow-hidden">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 shrink-0"><Activity className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Custo Operacional</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats?.totalPersonnelCost || 0)}
            </h3>
          </div>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-start gap-4 relative overflow-hidden">
          <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 shrink-0"><TrendingUp className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Comprometimento</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {stats?.kpiPersonnelCostPercent?.toFixed(1) || '0'}%
            </h3>
          </div>
        </motion.div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mt-6">
        <h3 className="text-lg font-black text-slate-900 mb-4">Próximos Passos</h3>
        <p className="text-slate-600 mb-4">Navegue pelas abas superiores para acessar e gerenciar a base de clientes alocada a este ciclo ou iniciar o apontamento de entregas mensais.</p>
      </div>
    </div>
  );
}
