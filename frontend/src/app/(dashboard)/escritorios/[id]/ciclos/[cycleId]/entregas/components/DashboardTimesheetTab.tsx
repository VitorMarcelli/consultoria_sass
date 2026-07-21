'use client';

import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import { Loader2, Clock, Plus } from 'lucide-react';

const TYPE_CONFIG: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  RECURRENT: { label: 'Recorrente', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20', dotClass: 'bg-emerald-500' },
  EXTRA: { label: 'Extra', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20', dotClass: 'bg-blue-500' },
  REWORK: { label: 'Retrabalho', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20', dotClass: 'bg-rose-500' },
};

const inputClass = 'w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40';

function formatHours(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export default function DashboardTimesheetTab({ tenantId, cycleId }: { tenantId: string; cycleId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [cycleComp, setCycleComp] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    employeeId: '',
    clientId: '',
    deliveryId: '',
    type: 'EXTRA',
    durationHours: '',
    durationMinutes: '',
    activityDescription: '',
    logDate: new Date().toISOString().split('T')[0],
  };
  const [form, setForm] = useState(emptyForm);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [logsRes, empRes, cliRes, cycleRes] = await Promise.all([
        apiRequest(`/timesheets?tenantId=${tenantId}`).catch(() => []),
        apiRequest(`/employees?tenantId=${tenantId}`).catch(() => []),
        apiRequest(`/clients?tenantId=${tenantId}`).catch(() => []),
        apiRequest(`/management-cycles/${cycleId}?tenantId=${tenantId}`).catch(() => null),
      ]);
      setEmployees(empRes || []);
      setClients(cliRes || []);

      let comp = '';
      if (cycleRes) {
        const mm = String(cycleRes.month).padStart(2, '0');
        comp = `${mm}/${cycleRes.year}`;
        setCycleComp(comp);
      }

      const filtered = comp
        ? (logsRes || []).filter((l: any) => {
            const d = new Date(l.startTime);
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            return `${mm}/${d.getFullYear()}` === comp;
          })
        : logsRes || [];
      setLogs(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, cycleId]);

  useEffect(() => {
    if (!form.clientId) {
      setDeliveries([]);
      return;
    }
    apiRequest(`/deliveries?tenantId=${tenantId}`)
      .then((all: any[]) =>
        setDeliveries(
          (all || []).filter(
            (d) => d.clientId === form.clientId && (!cycleComp || d.competence === cycleComp),
          ),
        ),
      )
      .catch(() => setDeliveries([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.clientId, tenantId, cycleComp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hours = parseInt(form.durationHours || '0', 10) || 0;
    const mins = parseInt(form.durationMinutes || '0', 10) || 0;
    const durationMinutes = hours * 60 + mins;

    if (!form.employeeId || !form.clientId || durationMinutes <= 0) {
      alert('Preencha colaborador, cliente e uma duração válida.');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/timesheets/manual', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          employeeId: form.employeeId,
          clientId: form.clientId,
          deliveryId: form.deliveryId || undefined,
          type: form.type,
          durationMinutes,
          activityDescription: form.activityDescription || undefined,
          logDate: form.logDate,
        }),
      });
      setForm({ ...emptyForm, employeeId: form.employeeId });
      loadAll();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar apontamento.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalsByType = logs.reduce((acc: Record<string, number>, l: any) => {
    acc[l.type] = (acc[l.type] || 0) + (l.durationMinutes || 0);
    return acc;
  }, {});

  const hasCostData = logs.some((l) => l.costAmount !== undefined && l.costAmount !== null);

  return (
    <div className="space-y-6">
      {/* Resumo do ciclo por tipo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(['RECURRENT', 'EXTRA', 'REWORK'] as const).map((t) => (
          <div key={t} className={`p-5 rounded-2xl border ${TYPE_CONFIG[t].badgeClass}`}>
            <span className="text-2xl font-black">{formatHours(totalsByType[t] || 0)}</span>
            <span className="block text-xs font-bold uppercase tracking-wider mt-1">{TYPE_CONFIG[t].label}</span>
          </div>
        ))}
      </div>

      {/* Form de apontamento */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-5 flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-500" /> Apontar Tempo
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required className={inputClass}>
            <option value="">Colaborador...</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>

          <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value, deliveryId: '' })} required className={inputClass}>
            <option value="">Cliente...</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select
            value={form.deliveryId}
            onChange={(e) => setForm({ ...form, deliveryId: e.target.value, type: e.target.value ? 'RECURRENT' : 'EXTRA' })}
            className={inputClass}
            disabled={!form.clientId}
          >
            <option value="">Sem entrega vinculada (avulso)</option>
            {deliveries.map((d) => <option key={d.id} value={d.id}>{d.standardizedName}</option>)}
          </select>

          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
            <option value="RECURRENT">Recorrente</option>
            <option value="EXTRA">Extra</option>
            <option value="REWORK">Retrabalho</option>
          </select>

          <div className="flex gap-2">
            <input type="number" min={0} placeholder="Horas" value={form.durationHours} onChange={(e) => setForm({ ...form, durationHours: e.target.value })} className={inputClass} />
            <input type="number" min={0} max={59} placeholder="Min" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} className={inputClass} />
          </div>

          <input type="date" value={form.logDate} onChange={(e) => setForm({ ...form, logDate: e.target.value })} className={inputClass} />

          <input
            type="text"
            placeholder="Descrição (opcional)"
            value={form.activityDescription}
            onChange={(e) => setForm({ ...form, activityDescription: e.target.value })}
            className={`${inputClass} md:col-span-2`}
          />

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Registrar</>}
          </button>
        </div>
      </form>

      {/* Lista de apontamentos do ciclo */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 pb-0">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Apontamentos do Ciclo</h3>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-500">Nenhum apontamento registrado neste ciclo ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold text-xs uppercase">
                <tr>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Colaborador</th>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3">Entrega</th>
                  <th className="px-6 py-3">Tipo</th>
                  <th className="px-6 py-3">Duração</th>
                  {hasCostData && <th className="px-6 py-3">Custo</th>}
                  <th className="px-6 py-3">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => {
                  const cfg = TYPE_CONFIG[log.type] || TYPE_CONFIG.EXTRA;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {new Date(log.startTime).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">{log.employee?.name || '---'}</td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{log.client?.name || '---'}</td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{log.delivery?.standardizedName || '—'}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${cfg.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-bold text-slate-700 dark:text-slate-300 tabular-nums">{formatHours(log.durationMinutes || 0)}</td>
                      {hasCostData && (
                        <td className="px-6 py-3 text-slate-600 dark:text-slate-400 tabular-nums">
                          {log.costAmount !== undefined && log.costAmount !== null ? `R$ ${Number(log.costAmount).toFixed(2)}` : '—'}
                        </td>
                      )}
                      <td className="px-6 py-3 text-slate-500 dark:text-slate-500 max-w-xs truncate">{log.activityDescription || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
