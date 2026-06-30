'use client';

import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import { Loader2, ArrowRightLeft } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

export default function DashboardLevelingTab({ tenantId, cycleId }: { tenantId: string, cycleId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeFront, setActiveFront] = useState<string>('');
  const [fronts, setFronts] = useState<any[]>([]);

  // States para o Drag and Drop simulado / Reagendamento
  const [rescheduling, setRescheduling] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const frontsData = await apiRequest(`/structures/fronts?tenantId=${tenantId}`);
        setFronts(frontsData);
        if (frontsData.length > 0) {
          const firstFrontId = frontsData[0].id;
          setActiveFront(firstFrontId);
          await loadLevelingData(firstFrontId);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [tenantId, cycleId]);

  const loadLevelingData = async (frontId: string) => {
    setLoading(true);
    setActiveFront(frontId);
    try {
      const dashData = await apiRequest(`/dashboard/leveling/${cycleId}/${frontId}`);
      setData(dashData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
        body: JSON.stringify({ deliveryIds: ids, newExecutionDate: targetDate })
      });
      alert(`Sucesso! ${ids.length} entregas foram reagendadas.`);
      await loadLevelingData(activeFront); // Reload
    } catch (err) {
      console.error(err);
      alert('Erro ao reagendar entregas.');
    } finally {
      setRescheduling(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-teal-500 animate-spin" />
        <p className="text-sm font-bold text-slate-500 mt-4">Carregando Fluxo de Nivelamento...</p>
      </div>
    );
  }

  if (!data) return null;

  // Calcula media ideal
  const totalDeliveries = data.timeline.reduce((acc: number, curr: any) => acc + curr.deliveries, 0);
  const avgDeliveries = data.timeline.length > 0 ? Math.round(totalDeliveries / data.timeline.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Departamento:</span>
        <div className="flex gap-2">
          {fronts.map(f => (
            <button
              key={f.id}
              onClick={() => loadLevelingData(f.id)}
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
        {/* Nivelamento Heijunka */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Nivelamento Diário (Heijunka)</h3>
              <p className="text-sm text-slate-500 mt-1">Achete a curva. Evite que todas as entregas se acumulem no dia do vencimento.</p>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-end gap-3 w-full md:w-auto">
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
                disabled={rescheduling || !selectedDate || !targetDate}
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
                
                {/* Linha da Média */}
                <ReferenceLine y={avgDeliveries} stroke="#f97316" strokeDasharray="3 3" label={{ position: 'top', value: `Média Ideal (${avgDeliveries})`, fill: '#f97316', fontSize: 12, fontWeight: 'bold' }} />
                
                <Bar dataKey="deliveries" fill="#10b981" radius={[4, 4, 0, 0]} name="Qtd Entregas">
                  {/* Se a barra passar muito da média, fica vermelha */}
                  {
                    data.timeline.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.deliveries > avgDeliveries * 1.5 ? '#ef4444' : '#10b981'} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
