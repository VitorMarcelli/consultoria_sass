'use client';

import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import { Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function DashboardMappingTab({ tenantId, cycleId }: { tenantId: string, cycleId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeFront, setActiveFront] = useState<string>(''); // Ficará dinâmico, mas mockaremos o 'fiscal'
  const [fronts, setFronts] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const frontsData = await apiRequest(`/structures/fronts?tenantId=${tenantId}`);
        setFronts(frontsData);
        if (frontsData.length > 0) {
          const firstFrontId = frontsData[0].id;
          setActiveFront(firstFrontId);
          const dashData = await apiRequest(`/dashboard/cycle-mapping/${cycleId}/${firstFrontId}?tenantId=${tenantId}`);
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
      const dashData = await apiRequest(`/dashboard/cycle-mapping/${cycleId}/${frontId}?tenantId=${tenantId}`);
      setData(dashData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const hasData = data && data.statusData?.total > 0;

  return (
    <div className="space-y-6">
      {/* Filtro de Departamento */}
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Loader2 className="h-10 w-10 text-teal-500 animate-spin" />
          <p className="text-sm font-bold text-slate-500 mt-4">Carregando Mapeamento Analítico...</p>
        </div>
      ) : !hasData ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Nenhum dado encontrado</h3>
          <p className="text-slate-500 mt-2 text-sm">Não há entregas alocadas neste departamento para este ciclo.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm h-96">
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6">Status do Cliente</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Ativos', value: data.statusData.ativos },
                { name: 'Inativos', value: data.statusData.inativos }
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px' }} />
                <Bar dataKey="value" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tributação */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6">Empresas por Tributação</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.taxRegimes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.taxRegimes.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Segmento */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm col-span-1 lg:col-span-2">
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6">Empresas por Segmento</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.segments}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Operador x Complexidade */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm col-span-1 lg:col-span-2">
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6">Responsáveis (Nº de Empresas por Complexidade)</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.operatorComplexity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} />
                <YAxis dataKey="operator" type="category" axisLine={false} tickLine={false} width={120} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px' }} />
                <Legend />
                {/* 0 a 5 */}
                <Bar dataKey="0" stackId="a" fill="#3b82f6" name="Nível 0" />
                <Bar dataKey="1" stackId="a" fill="#f97316" name="Nível 1" />
                <Bar dataKey="2" stackId="a" fill="#8b5cf6" name="Nível 2" />
                <Bar dataKey="3" stackId="a" fill="#eab308" name="Nível 3" />
                <Bar dataKey="4" stackId="a" fill="#06b6d4" name="Nível 4" />
                <Bar dataKey="5" stackId="a" fill="#ef4444" name="Nível 5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
