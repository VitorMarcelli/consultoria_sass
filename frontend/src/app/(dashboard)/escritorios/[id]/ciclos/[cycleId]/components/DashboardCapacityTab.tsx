'use client';

import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import { Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function DashboardCapacityTab({ tenantId, cycleId, activeFrontId }: { tenantId: string; cycleId: string; activeFrontId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeFrontId || !tenantId || !cycleId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const dashData = await apiRequest(`/dashboard/capacity/${cycleId}/${activeFrontId}?tenantId=${tenantId}`);
        setData(dashData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tenantId, cycleId, activeFrontId]);

  const hasData = data && data.capacityData && data.capacityData.length > 0;

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Loader2 className="h-10 w-10 text-teal-500 animate-spin" />
          <p className="text-sm font-bold text-slate-500 mt-4">Carregando Capacidade Operacional...</p>
        </div>
      ) : !hasData ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Nenhum operador alocado</h3>
          <p className="text-slate-500 mt-2 text-sm">Não há membros da equipe alocados nesta frente para este ciclo.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-6">
        {/* Ranking de Carga: quem está ocioso vs sobrecarregado */}
        <CapacityRanking capacityData={data.capacityData} />

        {/* Capacity Planning */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Distribuição do Tempo (Capacity Planning)</h3>
            <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl">Baseline: 168h mensais / Operador</span>
          </div>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.capacityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="employee" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px' }} />
                <Legend />
                <Bar dataKey="recurrent" stackId="a" fill="#10b981" name="Horas Comprometidas (Estimadas)" />
                <Bar dataKey="extra" stackId="a" fill="#3b82f6" name="Horas Extras" />
                <Bar dataKey="rework" stackId="a" fill="#f43f5e" name="Retrabalho" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; textClass: string; bgClass: string; barClass: string }> = {
  OVERLOADED: { label: 'Sobrecarregado', textClass: 'text-rose-600 dark:text-rose-400', bgClass: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20', barClass: 'bg-rose-500' },
  IDLE: { label: 'Ocioso', textClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20', barClass: 'bg-amber-500' },
  BALANCED: { label: 'Equilibrado', textClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20', barClass: 'bg-emerald-500' },
};

function CapacityRanking({ capacityData }: { capacityData: any[] }) {
  // Mais sobrecarregado primeiro, mais ocioso por último — é a lista que o
  // dono do escritório usa pra decidir onde intervir agora.
  const ranked = [...capacityData].sort((a, b) => (b.utilizationPercent || 0) - (a.utilizationPercent || 0));
  const overloadedCount = ranked.filter(r => r.status === 'OVERLOADED').length;
  const idleCount = ranked.filter(r => r.status === 'IDLE').length;

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Ranking de Carga por Colaborador</h3>
          <p className="text-sm text-slate-500 mt-1">Quem está sobrecarregado precisa de ajuda agora; quem está ocioso pode receber mais carteira.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {overloadedCount > 0 && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
              {overloadedCount} sobrecarregado{overloadedCount > 1 ? 's' : ''}
            </span>
          )}
          {idleCount > 0 && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
              {idleCount} ocioso{idleCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {ranked.map((row) => {
          const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.BALANCED;
          const barWidth = Math.min(100, row.utilizationPercent || 0);
          const delta = row.available - row.committed;

          return (
            <div key={row.employeeId || row.employee} className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 p-4 rounded-2xl border ${cfg.bgClass}`}>
              <div className="sm:w-40 shrink-0">
                <span className="text-sm font-black text-slate-800 dark:text-white">{row.employee}</span>
                <span className={`block text-[11px] font-bold mt-0.5 ${cfg.textClass}`}>{cfg.label}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="h-2.5 w-full bg-white/70 dark:bg-slate-950/50 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${cfg.barClass}`} style={{ width: `${barWidth}%` }} />
                </div>
              </div>

              <div className="sm:w-56 shrink-0 text-right sm:text-left">
                <span className="text-sm font-black text-slate-700 dark:text-slate-200 tabular-nums">{row.utilizationPercent}%</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                  {row.committed}h de {row.available}h
                </span>
                <span className={`block text-[11px] font-bold mt-0.5 ${cfg.textClass}`}>
                  {delta >= 0 ? `${delta}h livres` : `${Math.abs(delta)}h acima da capacidade`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
