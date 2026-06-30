'use client';

import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import { Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function DashboardCapacityTab({ tenantId, cycleId }: { tenantId: string, cycleId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeFront, setActiveFront] = useState<string>('');
  const [fronts, setFronts] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const frontsData = await apiRequest(`/structures/fronts?tenantId=${tenantId}`);
        setFronts(frontsData);
        if (frontsData.length > 0) {
          const firstFrontId = frontsData[0].id;
          setActiveFront(firstFrontId);
          const dashData = await apiRequest(`/dashboard/capacity/${cycleId}/${firstFrontId}`);
          setData(dashData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tenantId, cycleId]);

  const loadFrontData = async (frontId: string) => {
    setLoading(true);
    setActiveFront(frontId);
    try {
      const dashData = await apiRequest(`/dashboard/capacity/${cycleId}/${frontId}`);
      setData(dashData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-teal-500 animate-spin" />
        <p className="text-sm font-bold text-slate-500 mt-4">Carregando Tempos e Capacidade...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Departamento:</span>
        <div className="flex gap-2">
          {fronts.map(f => (
            <button
              key={f.id}
              onClick={() => loadFrontData(f.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeFront === f.id
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Capacity Planning */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
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
                <Bar dataKey="recurrent" stackId="a" fill="#10b981" name="Atividades Recorrentes" />
                <Bar dataKey="extra" stackId="a" fill="#3b82f6" name="Atividades Extras" />
                <Bar dataKey="rework" stackId="a" fill="#f43f5e" name="Retrabalho" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
