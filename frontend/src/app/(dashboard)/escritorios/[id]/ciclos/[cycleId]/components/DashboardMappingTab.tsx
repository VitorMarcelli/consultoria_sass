'use client';

import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import { Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const CLASS_COLORS: Record<string, string> = {
  C1: '#3b82f6', C2: '#14B8A6', C3: '#eab308', C4: '#f97316', C5: '#ef4444'
};

export default function DashboardMappingTab({ tenantId, cycleId, activeFrontId }: { tenantId: string; cycleId: string; activeFrontId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeFrontId || !tenantId || !cycleId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const dashData = await apiRequest(`/dashboard/cycle-mapping/${cycleId}/${activeFrontId}?tenantId=${tenantId}`);
        setData(dashData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tenantId, cycleId, activeFrontId]);

  const hasData = data && data.coverage?.totalClients > 0;

  return (
    <div className="space-y-6">
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
          <p className="text-slate-500 mt-2 text-sm">Nenhum cliente atua nesta frente neste ciclo.</p>
        </div>
      ) : (
      <div className="space-y-6">
        {/* Base de cálculo */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Base de Cálculo</p>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
              {data.coverage.assessedClients} de {data.coverage.activeClients}
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              clientes ativos ({data.coverage.coveragePercent != null ? `${data.coverage.coveragePercent}%` : '—'} de cobertura)
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CCA (Coeficiente da Área)</p>
            <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
              {data.cca != null ? data.cca : '—'}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">C0 (Sem Movimento/Inativos)</p>
            <p className="text-2xl font-black text-slate-400 mt-1">{data.c0Count}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pendentes de Avaliação</p>
            <p className="text-2xl font-black text-amber-500 mt-1">{data.pendingCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm h-96">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6">Status do Cliente na Frente</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Ativos', value: data.statusData.ativos },
                  { name: 'Inativos', value: data.statusData.inativos },
                  { name: 'Sem Movimento', value: data.statusData.semMovimento }
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

          {/* Curva de Complexidade */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm h-96">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Curva de Complexidade</h3>
            <p className="text-xs font-semibold text-slate-400 mb-5">
              Distribuição entre os {data.coverage.assessedClients} clientes avaliados — C0 e pendentes ficam fora da curva.
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.complexityCurve}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="class" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px' }}
                    formatter={(value: any, name: any, props: any) => [`${value} (${props.payload.percent}%)`, 'Clientes']}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {data.complexityCurve.map((entry: any) => (
                      <Cell key={entry.class} fill={CLASS_COLORS[entry.class] || '#94a3b8'} />
                    ))}
                  </Bar>
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
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6">Empresas por Segmento</h3>
            <div className="h-64">
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

          {/* Responsáveis x Complexidade */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm col-span-1 lg:col-span-2">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Responsáveis (Nº de Empresas por Complexidade)</h3>
            <p className="text-xs font-semibold text-slate-400 mb-5">
              CCR = coeficiente médio do responsável · Distância = CCR − CCA (positivo: carteira mais complexa que a média da área)
            </p>
            {data.byOwner.length === 0 ? (
              <p className="text-sm font-medium text-slate-400 py-8 text-center">Nenhum responsável com clientes avaliados ainda.</p>
            ) : (
              <>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byOwner} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis dataKey="ownerName" type="category" axisLine={false} tickLine={false} width={120} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px' }} />
                      <Legend />
                      {(['C1', 'C2', 'C3', 'C4', 'C5'] as const).map((cls) => (
                        <Bar key={cls} dataKey={`byClass.${cls}`} stackId="a" fill={CLASS_COLORS[cls]} name={cls} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-slate-400 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="text-left font-bold py-2">Responsável</th>
                        <th className="text-right font-bold py-2">Total</th>
                        <th className="text-right font-bold py-2">CCR</th>
                        <th className="text-right font-bold py-2">Distância (CCR − CCA)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.byOwner.map((owner: any) => (
                        <tr key={owner.ownerId}>
                          <td className="py-2 font-bold text-slate-800 dark:text-slate-200">{owner.ownerName}</td>
                          <td className="py-2 text-right font-semibold text-slate-600 dark:text-slate-400">{owner.total}</td>
                          <td className="py-2 text-right font-semibold text-slate-600 dark:text-slate-400">{owner.ccr ?? '—'}</td>
                          <td className={`py-2 text-right font-bold ${owner.distance == null ? 'text-slate-400' : owner.distance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {owner.distance != null ? (owner.distance > 0 ? `+${owner.distance}` : owner.distance) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
