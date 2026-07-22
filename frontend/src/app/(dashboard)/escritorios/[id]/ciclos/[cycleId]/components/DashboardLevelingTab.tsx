'use client';

import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import { Loader2, ArrowRightLeft } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';

export default function DashboardLevelingTab({ tenantId, cycleId, activeFrontId }: { tenantId: string; cycleId: string; activeFrontId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // States para o Drag and Drop simulado / Reagendamento
  const [rescheduling, setRescheduling] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');

  const loadLevelingData = async () => {
    if (!activeFrontId || !tenantId || !cycleId) return;
    setLoading(true);
    try {
      const dashData = await apiRequest(`/dashboard/leveling/${cycleId}/${activeFrontId}?tenantId=${tenantId}`);
      setData(dashData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedDate('');
    setTargetDate('');
    loadLevelingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, cycleId, activeFrontId]);

  const handleReschedule = async () => {
    if (!selectedDate || !targetDate) return;

    // Pegar IDs das entregas daquela data selecionada
    const deliveriesToMove = data.deliveriesList.filter((d: any) => {
      if (!d.executionDeadline) return false;
      const dDate = new Date(d.executionDeadline).toISOString().split('T')[0];
      return dDate === selectedDate;
    });

    if (deliveriesToMove.length === 0) {
      alert('Nenhuma entrega encontrada para a data de origem.');
      return;
    }

    const ids = deliveriesToMove.map((d: any) => d.id);
    setRescheduling(true);

    try {
      await apiRequest(`/dashboard/leveling/reschedule`, {
        method: 'PATCH',
        body: JSON.stringify({ deliveryIds: ids, newExecutionDate: targetDate, tenantId })
      });
      alert(`Sucesso! ${ids.length} entregas foram reagendadas.`);
      await loadLevelingData(); // Reload
    } catch (err) {
      console.error(err);
      alert('Erro ao reagendar entregas.');
    } finally {
      setRescheduling(false);
    }
  };


  // Calcula media ideal
  const totalDeliveries = data ? data.timeline.reduce((acc: number, curr: any) => acc + curr.deliveries, 0) : 0;
  const avgDeliveries = data && data.timeline.length > 0 ? Math.round(totalDeliveries / data.timeline.length) : 0;

  const hasData = data && data.timeline.length > 0;

  const deliveriesToMove = selectedDate && data ? data.deliveriesList.filter((d: any) => {
    if (!d.executionDeadline) return false;
    const dDate = new Date(d.executionDeadline).toISOString().split('T')[0];
    return dDate === selectedDate;
  }) : [];

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Loader2 className="h-10 w-10 text-teal-500 animate-spin" />
          <p className="text-sm font-bold text-slate-500 mt-4">Carregando Fluxo de Nivelamento...</p>
        </div>
      ) : !hasData ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Sem Prazos Definidos</h3>
          <p className="text-slate-500 mt-2 text-sm">Nenhuma entrega nesta frente/ciclo possui data de execução (Heijunka).</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-6">
        {/* Nivelamento Heijunka */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm relative overflow-hidden">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Nivelamento Diário (Heijunka)</h3>
              <p className="text-sm text-slate-500 mt-1">Achete a curva. Evite que todas as entregas se acumulem no dia do vencimento.</p>
              <p className="text-xs text-teal-600 mt-1 font-semibold">* Clique em uma barra no gráfico para selecionar as entregas desse dia.</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-[1.5rem] flex items-end gap-3 w-full md:w-auto shadow-inner">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Origem (Pico)</label>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm" />
              </div>
              <ArrowRightLeft className="w-4 h-4 text-slate-400 mb-2" />
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Destino (Vale)</label>
                <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm" />
              </div>
              <button
                onClick={handleReschedule}
                disabled={rescheduling || !selectedDate || !targetDate || deliveriesToMove.length === 0}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                {rescheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reagendar Lote'}
              </button>
            </div>
          </div>

          <div className="h-80 relative z-10">
            {loading && <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex flex-col items-center justify-center z-20"><Loader2 className="w-8 h-8 text-teal-600 animate-spin" /></div>}

            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.timeline} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} angle={-45} textAnchor="end" />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px' }} />

                <ReferenceLine y={avgDeliveries} stroke="#f97316" strokeDasharray="3 3" label={{ position: 'top', value: `Média Ideal (${avgDeliveries})`, fill: '#f97316', fontSize: 12, fontWeight: 'bold' }} />

                <Bar
                  dataKey="deliveries"
                  radius={[4, 4, 0, 0]}
                  name="Qtd Entregas"
                  onClick={(entry: any) => setSelectedDate(entry?.date || entry?.payload?.date)}
                  cursor="pointer"
                >
                  {
                    data.timeline.map((entry: any, index: number) => {
                      const isSelected = entry.date === selectedDate;
                      const isHigh = entry.deliveries > avgDeliveries * 1.5;
                      const fill = isSelected ? '#0f766e' : (isHigh ? '#ef4444' : '#10b981');
                      return <Cell key={`cell-${index}`} fill={fill} />;
                    })
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {selectedDate && (
            <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
              <h4 className="text-md font-bold text-slate-800 dark:text-slate-200 mb-4">
                Entregas alocadas no dia: <span className="text-teal-600">{new Date(selectedDate + 'T12:00:00Z').toLocaleDateString('pt-BR')}</span>
              </h4>

              {deliveriesToMove.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma entrega encontrada para esta data.</p>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 font-bold text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Tarefa</th>
                        <th className="px-4 py-3">Responsável</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {deliveriesToMove.map((d: any) => (
                        <tr key={d.id} className="hover:bg-white dark:hover:bg-slate-900 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{d.client?.name || '---'}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{d.standardizedName}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{d.responsible?.name || '---'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      )}
    </div>
  );
}
