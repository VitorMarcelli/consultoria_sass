import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  Play,
  Square,
  Paperclip, 
  MessageSquare,
  AlertCircle,
  Calendar,
  UserCircle2,
  Trash2,
  Loader2,
  FileCheck,
  Building2,
  CheckSquare
} from 'lucide-react';
import { apiRequest } from '@/utils/api';

interface DeliveryTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: any | null;
  tenantId: string;
}

export default function DeliveryTaskModal({ isOpen, onClose, delivery, tenantId }: DeliveryTaskModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'FILES'>('DETAILS');
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Forms
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newProofTitle, setNewProofTitle] = useState('');
  const [newProofUrl, setNewProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);

  // Timer State
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [baseTotalSeconds, setBaseTotalSeconds] = useState(0);
  
  // Estimated Time State
  const [isEditingEstimatedTime, setIsEditingEstimatedTime] = useState(false);
  const [estimatedTimeInput, setEstimatedTimeInput] = useState('');

  useEffect(() => {
    setMounted(true);
    if (isOpen && delivery?.id) {
      if (!details || details.id !== delivery.id) {
        setBaseTotalSeconds((delivery.realTimeMinutes || 0) * 60);
        setElapsedSeconds(0);
      }
      fetchDetails();
      setActiveTab('DETAILS');
    } else {
      setDetails(null);
      setTimerRunning(false);
      setElapsedSeconds(0);
    }
  }, [isOpen, delivery]);

  useEffect(() => {
    if (details) {
      setEstimatedTimeInput(details.estimatedTimeMinutes ? String(details.estimatedTimeMinutes) : '');
      
      let totalLogSeconds = 0;
      if (details.timeLogs && Array.isArray(details.timeLogs)) {
        totalLogSeconds = details.timeLogs.reduce((acc: number, log: any) => {
          if (log.status === 'FINISHED' && log.startTime && log.endTime) {
            const start = new Date(log.startTime).getTime();
            const end = new Date(log.endTime).getTime();
            return acc + Math.max(0, Math.floor((end - start) / 1000));
          }
          return acc;
        }, 0);
      }
      
      const hasLogs = details.timeLogs && Array.isArray(details.timeLogs);
      setBaseTotalSeconds(hasLogs ? totalLogSeconds : (details.realTimeMinutes || delivery?.realTimeMinutes || 0) * 60);
      
      const activeLog = details.timeLogs?.find((log: any) => log.status === 'RUNNING');
      if (activeLog) {
        const start = new Date(activeLog.startTime).getTime();
        const now = new Date().getTime();
        setElapsedSeconds(Math.floor((now - start) / 1000));
        setTimerRunning(true);
      } else {
        setElapsedSeconds(0);
        setTimerRunning(false);
      }
    }
  }, [details]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/deliveries/${delivery.id}/details?tenantId=${tenantId}`);
      setDetails(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await apiRequest(`/deliveries/${delivery.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ tenantId: tenantId, status: newStatus, authorName: 'Usuário Web' })
      });
      fetchDetails();
    } catch (err) {
      console.error(err);
      alert('Erro ao alterar status.');
    }
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistItem.trim()) return;
    try {
      await apiRequest(`/deliveries/${delivery.id}/checklist`, {
        method: 'POST',
        body: JSON.stringify({ tenantId: tenantId, description: newChecklistItem })
      });
      setNewChecklistItem('');
      fetchDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleChecklist = async (itemId: string, current: boolean) => {
    try {
      await apiRequest(`/deliveries/${delivery.id}/checklist/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ tenantId: tenantId, isCompleted: !current })
      });
      fetchDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveChecklist = async (itemId: string) => {
    try {
      await apiRequest(`/deliveries/${delivery.id}/checklist/${itemId}?tenantId=${tenantId}`, {
        method: 'DELETE'
      });
      fetchDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await apiRequest(`/deliveries/${delivery.id}/history`, {
        method: 'POST',
        body: JSON.stringify({ tenantId: tenantId, description: newComment, authorName: 'Usuário Web' })
      });
      setNewComment('');
      fetchDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProofTitle.trim() || !newProofUrl.trim()) return;
    try {
      setUploadingProof(true);
      await apiRequest(`/deliveries/${delivery.id}/proofs`, {
        method: 'POST',
        body: JSON.stringify({ tenantId: tenantId, title: newProofTitle, url: newProofUrl, authorName: 'Usuário Web' })
      });
      setNewProofTitle('');
      setNewProofUrl('');
      fetchDetails();
      setActiveTab('FILES');
    } catch (err) {
      console.error(err);
      alert('Erro ao anexar comprovante.');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleRemoveProof = async (proofId: string) => {
    try {
      await apiRequest(`/deliveries/${delivery.id}/proofs/${proofId}?tenantId=${tenantId}`, {
        method: 'DELETE'
      });
      fetchDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartTimer = async () => {
    try {
      setTimerRunning(true);
      await apiRequest(`/deliveries/${delivery.id}/timer/start`, {
        method: 'POST',
        body: JSON.stringify({ tenantId })
      });
      fetchDetails();
    } catch (err: any) {
      setTimerRunning(false);
      alert(err.message || 'Erro ao iniciar o timer.');
    }
  };

  const handleStopTimer = async () => {
    try {
      setTimerRunning(false);
      await apiRequest(`/deliveries/${delivery.id}/timer/stop`, {
        method: 'POST',
        body: JSON.stringify({ tenantId })
      });
      fetchDetails();
    } catch (err: any) {
      alert(err.message || 'Erro ao parar o timer.');
    }
  };

  const handleSaveEstimatedTime = async () => {
    try {
      await apiRequest(`/deliveries/${delivery.id}/estimated-time`, {
        method: 'PATCH',
        body: JSON.stringify({ tenantId, estimatedTimeMinutes: estimatedTimeInput, authorName: 'Usuário Web' })
      });
      setIsEditingEstimatedTime(false);
      fetchDetails();
    } catch (err: any) {
      alert('Erro ao atualizar tempo estimado.');
    }
  };

  if (!mounted) return null;

  const currentStatus = details?.status || delivery?.status || 'PREVISTA';
  const checklists = details?.checklists || [];
  const proofs = details?.proofs || [];
  const history = details?.history || [];

  const totalSeconds = baseTotalSeconds + elapsedSeconds;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const currentEstimatedTimeMinutes = details?.estimatedTimeMinutes ?? delivery?.estimatedTimeMinutes;
  const isOverdue = currentEstimatedTimeMinutes && totalSeconds > currentEstimatedTimeMinutes * 60;
  const timerColorClass = isOverdue 
    ? (timerRunning ? 'text-rose-500 animate-pulse' : 'text-rose-500') 
    : (timerRunning ? 'text-teal-500 animate-pulse' : 'text-slate-900 dark:text-white');

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-slate-50 dark:bg-slate-900 rounded-[2rem] w-full max-w-6xl shadow-2xl relative flex flex-col my-auto max-h-[90vh] overflow-hidden border border-slate-200/50 dark:border-slate-800"
        >
          {/* Header */}
          <div className="bg-white dark:bg-slate-950 p-6 sm:p-8 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shrink-0 relative z-10">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-black tracking-widest uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-md">
                  {delivery?.front?.name || 'Frente'}
                </span>
                <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-md
                  ${delivery?.priority === 'HIGH' ? 'bg-rose-500/10 text-rose-600' : 
                    delivery?.priority === 'LOW' ? 'bg-sky-500/10 text-sky-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                >
                  Prioridade {delivery?.priority === 'HIGH' ? 'Alta' : delivery?.priority === 'LOW' ? 'Baixa' : 'Média'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                {delivery?.standardizedName || delivery?.originalName}
              </h2>
              <div className="flex items-center gap-2 mt-2 text-sm font-bold text-slate-500">
                <Building2 className="w-4 h-4" />
                <span>{delivery?.client?.name || 'Cliente Não Informado'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto w-full sm:w-auto">
                <button 
                  onClick={() => handleStatusChange('PREVISTA')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${currentStatus === 'PREVISTA' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Prevista
                </button>
                <button 
                  onClick={() => handleStatusChange('ANDAMENTO')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${currentStatus === 'ANDAMENTO' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-500'}`}
                >
                  Em Andamento
                </button>
                <button 
                  onClick={() => handleStatusChange('CONCLUIDA')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${currentStatus === 'CONCLUIDA' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-500'}`}
                >
                  Concluída
                </button>
              </div>
              <button onClick={onClose} className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl transition-colors shrink-0 ml-2">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-20">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500 mb-4" />
              <p className="text-slate-500 font-bold">Carregando detalhes da tarefa...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Main Column (Left) */}
              <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 overflow-y-auto custom-scrollbar p-6 sm:p-8 bg-white dark:bg-slate-950/50">
                
                {/* Description / Metadata */}
                <div className="mb-8">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-teal-500" /> Detalhes da Obrigação
                  </h3>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    {delivery?.originalName}
                    <br/><br/>
                    <span className="font-bold">Observações:</span> {delivery?.observations || 'Nenhuma observação informada.'}
                  </p>
                </div>

                {/* Checklist */}
                <div className="mb-8">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-teal-500" /> Checklist Operacional
                  </h3>
                  
                  <div className="space-y-2 mb-4">
                    {checklists.length === 0 && (
                      <p className="text-xs font-bold text-slate-400 italic">Nenhum item no checklist.</p>
                    )}
                    {checklists.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl group transition-all hover:border-slate-200 dark:hover:border-slate-700">
                        <button 
                          onClick={() => handleToggleChecklist(item.id, item.isCompleted)}
                          className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors shrink-0
                            ${item.isCompleted ? 'bg-teal-500 border-teal-500 text-white' : 'border-slate-300 dark:border-slate-600 text-transparent'}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <span className={`flex-1 text-sm font-semibold transition-all ${item.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                          {item.description}
                        </span>
                        <button onClick={() => handleRemoveChecklist(item.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddChecklist} className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Adicionar novo item ao checklist..." 
                      value={newChecklistItem}
                      onChange={e => setNewChecklistItem(e.target.value)}
                      className="flex-1 h-11 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-sm font-medium outline-none focus:border-teal-500 transition-colors dark:text-white"
                    />
                    <button type="submit" disabled={!newChecklistItem.trim()} className="h-11 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-50">
                      Adicionar
                    </button>
                  </form>
                </div>

                {/* Activity / Comments */}
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-teal-500" /> Histórico e Comentários
                  </h3>
                  
                  <div className="space-y-4 mb-6">
                    {history.length === 0 && (
                      <p className="text-xs font-bold text-slate-400 italic">Nenhum histórico registrado.</p>
                    )}
                    {history.map((hist: any) => (
                      <div key={hist.id} className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 font-black text-xs shrink-0">
                          {hist.authorName?.charAt(0) || 'S'}
                        </div>
                        <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white">{hist.authorName || 'Sistema'}</span>
                            <span className="text-[10px] font-bold text-slate-400">{new Date(hist.createdAt).toLocaleString('pt-BR')}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            {hist.action === 'STATUS_CHANGED' && <span className="font-bold text-teal-600 dark:text-teal-400 mr-1">[Status]</span>}
                            {hist.action === 'PROOF_ADDED' && <span className="font-bold text-blue-600 dark:text-blue-400 mr-1">[Comprovante]</span>}
                            {hist.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddComment} className="flex flex-col gap-2">
                    <textarea 
                      placeholder="Escreva um comentário ou atualização..." 
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      className="w-full h-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm font-medium outline-none focus:border-teal-500 transition-colors dark:text-white resize-none"
                    />
                    <div className="flex justify-end">
                      <button type="submit" disabled={!newComment.trim()} className="px-6 py-2.5 bg-teal-600 text-white font-bold text-sm rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50">
                        Comentar
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Sidebar (Right) */}
              <div className="w-full lg:w-80 bg-slate-50 dark:bg-slate-900 flex flex-col overflow-y-auto custom-scrollbar border-t lg:border-t-0 border-slate-200 dark:border-slate-800 p-6 sm:p-8">
                
                {/* Time Tracker Block */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" /> Tempo Gasto
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-black font-mono transition-colors ${timerColorClass}`}>
                        {formattedTime}
                      </span>
                      {isOverdue && (
                        <span className="text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 px-1.5 py-0.5 rounded-md">
                          Atraso
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleStartTimer}
                      disabled={timerRunning}
                      className={`flex-1 font-bold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 
                        ${timerRunning ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed' : 'bg-teal-50 hover:bg-teal-100 dark:bg-teal-500/10 dark:hover:bg-teal-500/20 text-teal-700 dark:text-teal-400'}`}
                    >
                      <Play className="w-3.5 h-3.5" /> Iniciar
                    </button>
                    <button 
                      onClick={handleStopTimer}
                      disabled={!timerRunning}
                      className={`px-4 font-bold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center
                        ${!timerRunning ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed' : 'bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20'}`}
                    >
                      <Square className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="mt-3 text-center flex items-center justify-center gap-2">
                    {isEditingEstimatedTime ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="0"
                          value={estimatedTimeInput} 
                          onChange={e => setEstimatedTimeInput(e.target.value)} 
                          className="w-16 h-7 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-center outline-none focus:border-teal-500 text-slate-900 dark:text-white" 
                          placeholder="Min" 
                        />
                        <button onClick={handleSaveEstimatedTime} className="text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 font-bold text-xs">Salvar</button>
                        <button onClick={() => setIsEditingEstimatedTime(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-xs">Cancelar</button>
                      </div>
                    ) : (
                      <>
                        <span className="text-[10px] font-bold text-slate-400">
                          Estimado: {currentEstimatedTimeMinutes ? `${Math.floor(currentEstimatedTimeMinutes / 60)}h ${currentEstimatedTimeMinutes % 60}m` : 'Não definido'}
                        </span>
                        <button onClick={() => setIsEditingEstimatedTime(true)} className="text-slate-400 hover:text-teal-500 transition-colors" title="Editar Tempo Estimado">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Info Blocks */}
                <div className="space-y-4 mb-8">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Responsável</span>
                    <div className="flex items-center gap-2">
                      <UserCircle2 className="w-5 h-5 text-slate-400" />
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{delivery?.responsible?.name || 'Não atribuído'}</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Competência</span>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-slate-400" />
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{delivery?.competence || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Comprovantes */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <Paperclip className="w-4 h-4 text-teal-500" /> Anexos e Comprovantes
                  </h4>

                  <div className="space-y-3 mb-4">
                    {proofs.length === 0 && (
                      <p className="text-[10px] font-bold text-slate-400 italic text-center py-2">Nenhum anexo.</p>
                    )}
                    {proofs.map((proof: any) => (
                      <div key={proof.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2 group">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{proof.title}</span>
                          <button onClick={() => handleRemoveProof(proof.id)} className="text-slate-400 hover:text-red-500 transition-colors shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <a href={proof.url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-500 hover:underline truncate">
                          {proof.url}
                        </a>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddProof} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <input 
                      type="text" 
                      placeholder="Nome do Comprovante" 
                      value={newProofTitle}
                      onChange={e => setNewProofTitle(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-teal-500 dark:text-white"
                    />
                    <input 
                      type="url" 
                      placeholder="Link (Google Drive, S3, etc)" 
                      value={newProofUrl}
                      onChange={e => setNewProofUrl(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-teal-500 dark:text-white"
                    />
                    <button type="submit" disabled={uploadingProof || !newProofTitle.trim() || !newProofUrl.trim()} className="w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-50">
                      Anexar Link
                    </button>
                  </form>
                </div>

              </div>
            </div>
          )}
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
