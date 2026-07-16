'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Clock, DollarSign, Plus, Check, X, Building2, User, ChevronRight, AlertCircle, FileText } from 'lucide-react';
import { apiRequest } from '@/utils/api';

interface Client {
  id: string;
  name: string;
  monthlyFee?: number;
}

interface Employee {
  id: string;
  name: string;
}

export default function TimerWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'timer' | 'manual' | 'dre'>('timer');
  const [tenantId, setTenantId] = useState<string>('');
  
  // Dados de apoio
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Estado do Timer
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Estado Manual
  const [manualMinutes, setManualMinutes] = useState(30);

  // Estado DRE
  const [dreData, setDreData] = useState<any>(null);
  const [loadingDre, setLoadingDre] = useState(false);

  useEffect(() => {
    // Tenta carregar o tenantId armazenado ou pega o primeiro disponível
    const stored = localStorage.getItem('sevilha_active_tenant_id');
    if (stored) {
      setTenantId(stored);
    } else {
      // Fetch tenants
      apiRequest('/tenants').then(res => {
        if (res?.length) {
          setTenantId(res[0].id);
          localStorage.setItem('sevilha_active_tenant_id', res[0].id);
        }
      }).catch(err => console.warn('Erro ao carregar tenants no widget', err));
    }
  }, []);

  useEffect(() => {
    if (tenantId && isOpen) {
      apiRequest(`/clients?tenantId=${tenantId}`).then(res => setClients(res)).catch(() => {});
      apiRequest(`/employees?tenantId=${tenantId}`).then(res => setEmployees(res)).catch(() => {});
    }
  }, [tenantId, isOpen]);

  // Efeito do relógio
  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Carrega DRE quando muda aba ou cliente
  useEffect(() => {
    if (tab === 'dre' && tenantId && selectedClientId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingDre(true);
      apiRequest(`/timesheets/dre/${selectedClientId}?tenantId=${tenantId}`)
        .then(res => setDreData(res))
        .catch(err => console.warn('Erro ao carregar DRE', err))
        .finally(() => setLoadingDre(false));
    }
  }, [tab, selectedClientId, tenantId]);

  const handleStartTimer = async () => {
    if (!selectedClientId || !selectedEmployeeId) {
      alert('Selecione um cliente e um colaborador.');
      return;
    }
    try {
      const res = await apiRequest('/timesheets/start', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          clientId: selectedClientId,
          employeeId: selectedEmployeeId,
          activityDescription,
        }),
      });
      setActiveLogId(res.id);
      setIsRunning(true);
      setElapsedSeconds(0);
    } catch (error) {
      const err = error as any;
      alert(err.message || 'Erro ao iniciar timer.');
    }
  };

  const handleStopTimer = async () => {
    if (!activeLogId) return;
    try {
      const res = await apiRequest(`/timesheets/stop/${activeLogId}`, {
        method: 'POST',
        body: JSON.stringify({ tenantId }),
      });
      setIsRunning(false);
      setActiveLogId(null);
      alert(`Timer finalizado! Tempo registrado: ${res.durationMinutes} minutos. Custo calculado: R$ ${res.costAmount}`);
      // Atualiza DRE se estiver selecionado
      if (tab === 'dre') {
        apiRequest(`/timesheets/dre/${selectedClientId}?tenantId=${tenantId}`).then(setDreData);
      }
    } catch (error) {
      const err = error as any;
      alert(err.message || 'Erro ao parar timer.');
    }
  };

  const handleManualSubmit = async () => {
    if (!selectedClientId || !selectedEmployeeId || !manualMinutes) {
      alert('Preencha cliente, colaborador e quantidade de minutos.');
      return;
    }
    try {
      await apiRequest('/timesheets/manual', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          clientId: selectedClientId,
          employeeId: selectedEmployeeId,
          activityDescription: activityDescription || 'Lançamento manual',
          durationMinutes: Number(manualMinutes),
        }),
      });
      alert('Lançamento manual gravado com sucesso!');
      if (tab === 'dre') {
        apiRequest(`/timesheets/dre/${selectedClientId}?tenantId=${tenantId}`).then(setDreData);
      }
    } catch (error) {
      const err = error as any;
      alert(err.message || 'Erro ao gravar lançamento manual.');
    }
  };

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs > 0 ? `${hrs}:` : ''}${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-6 right-6 z-[90]">
      {/* Botão Flutuante (FAB) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            onClick={() => setIsOpen(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`flex items-center gap-3 px-5 py-3 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.3)] border border-white/20 dark:border-slate-800 backdrop-blur-xl transition-all ${
              isRunning 
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white animate-pulse'
                : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200'
            }`}
          >
            <Clock className={`w-5 h-5 ${isRunning ? 'animate-spin' : ''}`} />
            <span className="font-bold text-sm tracking-wide">
              {isRunning ? `Gravando (${formatTime(elapsedSeconds)})` : 'Timesheet & DRE'}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Janela Modal / Popover Expandido */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="w-[90vw] sm:w-[460px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
          >
            {/* Cabecalho */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-2xl text-teal-600 dark:text-teal-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">Timesheet TASS</h3>
                  <p className="text-xs text-slate-500 font-medium">Controle de Horas & DRE de Contrato</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Abas de Navegacao */}
            <div className="p-3 bg-slate-100/50 dark:bg-slate-950/50 border-b border-slate-200/50 dark:border-slate-800/50 flex gap-2">
              <button
                onClick={() => setTab('timer')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  tab === 'timer'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                Cronômetro
              </button>
              <button
                onClick={() => setTab('manual')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  tab === 'manual'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Lançar Manual
              </button>
              <button
                onClick={() => setTab('dre')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  tab === 'dre'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                DRE Contrato
              </button>
            </div>

            {/* Conteudo Principal */}
            <div className="p-5 flex-1 overflow-y-auto max-h-[420px] custom-scrollbar flex flex-col gap-4">
              
              {/* Seletores Comuns (Cliente e Colaborador) */}
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-500" />
                    Cliente Associado
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={e => setSelectedClientId(e.target.value)}
                    disabled={isRunning}
                    className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-semibold outline-none focus:border-teal-500 transition-colors disabled:opacity-50"
                  >
                    <option value="">Selecione um cliente...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {tab !== 'dre' && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-teal-500" />
                      Colaborador
                    </label>
                    <select
                      value={selectedEmployeeId}
                      onChange={e => setSelectedEmployeeId(e.target.value)}
                      disabled={isRunning}
                      className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-semibold outline-none focus:border-teal-500 transition-colors disabled:opacity-50"
                    >
                      <option value="">Selecione o colaborador...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* ABA 1: TIMER */}
              {tab === 'timer' && (
                <div className="flex flex-col gap-4 mt-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-teal-500" />
                      Descrição da Atividade
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Apuração fiscal, conciliação bancária..."
                      value={activityDescription}
                      onChange={e => setActivityDescription(e.target.value)}
                      disabled={isRunning}
                      className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-medium outline-none focus:border-teal-500 transition-colors disabled:opacity-50"
                    />
                  </div>

                  <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-3xl relative overflow-hidden">
                    <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 z-10">
                      {formatTime(elapsedSeconds)}
                    </span>

                    {isRunning ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleStopTimer}
                        className="flex items-center gap-2 px-8 py-3.5 bg-red-500 hover:bg-red-600 text-white font-extrabold text-sm rounded-full shadow-[0_8px_20px_rgba(239,68,68,0.3)] transition-colors z-10"
                      >
                        <Square className="w-4 h-4 fill-white" />
                        PARAR TIMER
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleStartTimer}
                        className="flex items-center gap-2 px-8 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm rounded-full shadow-[0_8px_20px_rgba(13,148,136,0.3)] transition-colors z-10"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        INICIAR TIMER
                      </motion.button>
                    )}

                    {isRunning && (
                      <div className="absolute inset-0 bg-emerald-500/5 animate-pulse rounded-3xl pointer-events-none" />
                    )}
                  </div>
                </div>
              )}

              {/* ABA 2: MANUAL */}
              {tab === 'manual' && (
                <div className="flex flex-col gap-4 mt-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-teal-500" />
                      Descrição da Atividade
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Reunião com cliente, auditoria..."
                      value={activityDescription}
                      onChange={e => setActivityDescription(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-medium outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Duração (Minutos)</span>
                      <span className="text-teal-600 dark:text-teal-400 font-extrabold text-sm">{manualMinutes} min</span>
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="480"
                      step="5"
                      value={manualMinutes}
                      onChange={e => setManualMinutes(Number(e.target.value))}
                      className="w-full accent-teal-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg my-2"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>5 min</span>
                      <span>1 hora</span>
                      <span>4 horas</span>
                      <span>8 horas</span>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleManualSubmit}
                    className="w-full py-3.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-extrabold text-sm rounded-2xl shadow-lg transition-colors flex items-center justify-center gap-2 mt-2"
                  >
                    <Check className="w-4 h-4" />
                    Gravar Lançamento Manual
                  </motion.button>
                </div>
              )}

              {/* ABA 3: DRE DO CONTRATO */}
              {tab === 'dre' && (
                <div className="flex flex-col gap-4 mt-2">
                  {!selectedClientId ? (
                    <div className="p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl text-center flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-amber-500" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        Selecione um cliente acima para gerar a análise de lucratividade (DRE) em tempo real.
                      </p>
                    </div>
                  ) : loadingDre ? (
                    <div className="p-12 text-center text-xs font-bold text-slate-500 animate-pulse">
                      Carregando métricas do contrato...
                    </div>
                  ) : dreData ? (
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex flex-col">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Honorário (Receita)</span>
                          <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                            R$ {dreData.client.monthlyFee?.toFixed(2)}
                          </span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex flex-col">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Horas Consumidas</span>
                          <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                            {dreData.totalDurationHours}h
                          </span>
                        </div>
                      </div>

                      {/* Margem Liquida */}
                      <div className={`p-5 rounded-3xl border flex flex-col items-center text-center transition-all ${
                        dreData.netMargin >= 0
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                          : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
                      }`}>
                        <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                          Resultado Líquido (Margem)
                        </span>
                        <div className="text-3xl font-black tracking-tighter">
                          R$ {dreData.netMargin.toFixed(2)}
                        </div>
                        <div className="text-xs font-extrabold mt-1 py-1 px-3 rounded-full bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
                          {dreData.netMarginPercent}% de rentabilidade
                        </div>
                      </div>

                      {/* Lista de Apontamentos */}
                      <div className="flex flex-col gap-2 mt-1">
                        <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Últimos Apontamentos
                        </h4>
                        {dreData.detailedLogs?.length ? (
                          <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                            {dreData.detailedLogs.map((log: Record<string, any>) => (
                              <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3">
                                <div className="flex flex-col truncate">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{log.activityDescription}</span>
                                  <span className="text-[10px] text-slate-500 font-medium">{log.employeeName} • {new Date(log.startTime).toLocaleDateString()}</span>
                                </div>
                                <div className="flex flex-col items-end flex-shrink-0">
                                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">{log.durationMinutes} min</span>
                                  {log.costAmount !== undefined ? (
                                    <span className="text-[10px] font-bold text-red-500 dark:text-red-400">R$ {log.costAmount.toFixed(2)}</span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">Custo sigiloso</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">Nenhum apontamento finalizado para este cliente no período.</p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
