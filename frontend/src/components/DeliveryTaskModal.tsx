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
import { createClient } from '@/utils/supabase/client';
import { apiRequest } from '@/utils/api';

interface DeliveryTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: any | null;
  tenantId: string;
  userRole?: string;
}

export default function DeliveryTaskModal({ isOpen, onClose, delivery, tenantId, userRole }: DeliveryTaskModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'FILES'>('DETAILS');
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Forms
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newComment, setNewComment] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  // Estimated Time State
  const [isEditingEstimatedTime, setIsEditingEstimatedTime] = useState(false);
  const [estimatedTimeInput, setEstimatedTimeInput] = useState('');

  useEffect(() => {
    setMounted(true);
    if (isOpen && delivery?.id) {
      if (!details || details.id !== delivery.id) {
        // Reset state on new delivery
      }
      fetchDetails();
      setActiveTab('DETAILS');
    } else {
      setDetails(null);
    }
  }, [isOpen, delivery]);

  useEffect(() => {
    if (details) {
      setEstimatedTimeInput(details.estimatedTimeMinutes ? String(details.estimatedTimeMinutes) : '');
    }
  }, [details]);

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
    if (!selectedFile) return;

    try {
      setUploadingProof(true);
      const supabase = createClient();
      
      // Generate a unique file name to avoid collisions
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${tenantId}/${delivery.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('proofs')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error('Falha ao enviar arquivo para o Storage: ' + uploadError.message);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('proofs')
        .getPublicUrl(filePath);

      await apiRequest(`/deliveries/${delivery.id}/proofs`, {
        method: 'POST',
        body: JSON.stringify({ 
          tenantId: tenantId, 
          title: selectedFile.name, 
          url: publicUrl, 
          authorName: 'Usuário Web' 
        })
      });
      
      setSelectedFile(null);
      fetchDetails();
      setActiveTab('FILES');
    } catch (err) {
      console.error(err);
      alert('Erro ao anexar arquivo.');
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

  const currentEstimatedTimeMinutes = details?.estimatedTimeMinutes ?? delivery?.estimatedTimeMinutes;
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
              <div className="flex p-1.5 bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl overflow-x-auto w-full sm:w-auto border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
                <button 
                  onClick={() => handleStatusChange('PREVISTA')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${currentStatus === 'PREVISTA' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}
                >
                  <Calendar className={`w-3.5 h-3.5 ${currentStatus === 'PREVISTA' ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400'}`} />
                  Prevista
                </button>

                <button 
                  onClick={() => handleStatusChange(currentStatus === 'ATRASADA' ? 'ATRASADA' : 'ANDAMENTO')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap 
                    ${currentStatus === 'ANDAMENTO' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 ring-1 ring-amber-600' : 
                      currentStatus === 'ATRASADA' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20 ring-1 ring-rose-600' : 
                      'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10'}`}
                >
                  {currentStatus === 'ATRASADA' ? (
                    <>
                      <AlertCircle className={`w-3.5 h-3.5 ${currentStatus === 'ATRASADA' ? 'text-white' : 'text-rose-400'}`} />
                      Atrasada
                    </>
                  ) : (
                    <>
                      <Clock className={`w-3.5 h-3.5 ${currentStatus === 'ANDAMENTO' ? 'text-white' : 'text-amber-400'}`} />
                      Em Andamento
                    </>
                  )}
                </button>

                <button 
                  onClick={() => handleStatusChange('CONCLUIDA')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap 
                    ${currentStatus === 'CONCLUIDA' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 ring-1 ring-emerald-600' : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'}`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${currentStatus === 'CONCLUIDA' ? 'text-white' : 'text-emerald-400'}`} />
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
                
                {/* Meta-data Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {/* Responsável */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <UserCircle2 className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Responsável</span>
                      <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{delivery?.responsible?.name || 'Não atribuído'}</span>
                    </div>
                  </div>

                  {/* Competência */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Competência</span>
                      <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{delivery?.competence || '-'}</span>
                    </div>
                  </div>

                  {/* Data Planejada */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Data Planejada</span>
                      <input 
                        type="date"
                        disabled={userRole === 'OPERATOR'}
                        value={delivery?.executionDeadline ? delivery.executionDeadline.split('T')[0] : ''}
                        onChange={async (e) => {
                          const val = e.target.value;
                          const execDate = val ? new Date(`${val}T12:00:00Z`).toISOString() : null;
                          try {
                            await apiRequest(`/deliveries/${delivery.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ tenantId, executionDeadline: execDate })
                            });
                            onClose(); // Reload data
                          } catch (err) {
                            alert('Erro ao atualizar data planejada.');
                          }
                        }}
                        className="w-full text-sm font-extrabold text-slate-800 dark:text-slate-200 bg-transparent outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed -ml-1"
                      />
                    </div>
                  </div>

                  {/* Tempo Padrão */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        Tempo Padrão
                        {!isEditingEstimatedTime && userRole !== 'OPERATOR' && (
                          <button onClick={() => setIsEditingEstimatedTime(true)} className="hover:text-teal-500 transition-colors">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                        )}
                      </span>
                      {isEditingEstimatedTime ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            min="0"
                            value={estimatedTimeInput} 
                            onChange={e => setEstimatedTimeInput(e.target.value)} 
                            className="w-16 h-6 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1 text-center outline-none focus:border-teal-500 text-slate-900 dark:text-white" 
                            placeholder="Min" 
                          />
                          <button onClick={handleSaveEstimatedTime} className="text-teal-600 dark:text-teal-400 font-bold text-[10px] uppercase">Salvar</button>
                        </div>
                      ) : (
                        <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                          {currentEstimatedTimeMinutes ? `${Math.floor(currentEstimatedTimeMinutes / 60)}h ${currentEstimatedTimeMinutes % 60}m` : 'Não definido'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-8">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descrição</h3>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    <p>{delivery?.originalName}</p>
                    {delivery?.observations && (
                      <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-900/50">
                        <p className="text-amber-800 dark:text-amber-400"><span className="font-bold">Observações:</span> {delivery.observations}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Checklist */}
                <div className="mb-10">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Checklist Operacional</h3>
                  <div className="space-y-2 mb-3">
                    {checklists.length === 0 && (
                      <p className="text-xs font-medium text-slate-400 italic">Adicione sub-tarefas e passos para concluir esta entrega.</p>
                    )}
                    {checklists.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3 group">
                        <button 
                          onClick={() => handleToggleChecklist(item.id, item.isCompleted)}
                          className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors shrink-0
                            ${item.isCompleted ? 'bg-teal-500 border-teal-500 text-white' : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-teal-500'}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <span className={`flex-1 text-sm transition-all ${item.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300 font-medium'}`}>
                          {item.description}
                        </span>
                        <button onClick={() => handleRemoveChecklist(item.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddChecklist} className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-slate-300 shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Adicionar item..." 
                      value={newChecklistItem}
                      onChange={e => setNewChecklistItem(e.target.value)}
                      className="flex-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-teal-500 px-1 py-1 text-sm font-medium outline-none transition-colors dark:text-white"
                    />
                  </form>
                </div>

                {/* Anexos e Comprovantes */}
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Anexos e Comprovantes</h3>
                  <div className="space-y-2 mb-3">
                    {proofs.length === 0 && (
                      <p className="text-xs font-medium text-slate-400 italic">Nenhum anexo adicionado.</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {proofs.map((proof: any) => (
                        <div key={proof.id} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2 group hover:border-slate-300 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{proof.title}</span>
                            <button onClick={() => handleRemoveProof(proof.id)} className="text-slate-400 hover:text-red-500 transition-colors shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <a href={proof.url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-teal-600 hover:underline truncate">
                            {proof.url}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleAddProof} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                    <Paperclip className="w-5 h-5 text-slate-300 shrink-0 hidden sm:block" />
                    <div className="flex-1 relative w-full">
                      <input 
                        type="file" 
                        id="file-upload"
                        onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <label htmlFor="file-upload" className="flex items-center justify-between w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-dashed rounded-xl px-4 py-3 cursor-pointer hover:border-teal-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                          {selectedFile ? selectedFile.name : 'Clique para selecionar um arquivo...'}
                        </span>
                        <div className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider shrink-0">
                          Procurar
                        </div>
                      </label>
                    </div>
                    <button type="submit" disabled={uploadingProof || !selectedFile} className="px-5 py-3 h-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-50 whitespace-nowrap flex items-center gap-2">
                      {uploadingProof ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                        </>
                      ) : (
                        'Anexar'
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Sidebar (Right) - Chat Feed */}
              <div className="w-full lg:w-96 bg-slate-50 dark:bg-slate-900 flex flex-col border-t lg:border-t-0 border-slate-200 dark:border-slate-800 h-[600px] lg:h-auto">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400" /> Histórico e Comentários
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                  {history.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-50">
                      <MessageSquare className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-xs font-bold text-slate-500">Nenhuma atividade ainda.</p>
                    </div>
                  )}
                  {history.map((hist: any) => (
                    <div key={hist.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 font-black text-xs shrink-0">
                        {hist.authorName?.charAt(0) || 'S'}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">{hist.authorName || 'Sistema'}</span>
                          <span className="text-[10px] font-bold text-slate-400">{new Date(hist.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-700/50 mt-1">
                          {hist.action === 'STATUS_CHANGED' && <span className="font-bold text-teal-600 dark:text-teal-400 mr-1 block mb-1">Mudança de Status</span>}
                          {hist.action === 'PROOF_ADDED' && <span className="font-bold text-blue-600 dark:text-blue-400 mr-1 block mb-1">Comprovante Anexado</span>}
                          {hist.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-white dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 shrink-0">
                  <form onSubmit={handleAddComment} className="flex flex-col gap-2 relative">
                    <textarea 
                      placeholder="Escreva um comentário..." 
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      className="w-full min-h-[60px] max-h-[120px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pr-12 text-xs font-medium outline-none focus:border-teal-500 transition-colors dark:text-white resize-y"
                    />
                    <button type="submit" disabled={!newComment.trim()} className="absolute right-2 bottom-2 w-8 h-8 flex items-center justify-center bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50">
                      <Play className="w-3.5 h-3.5" />
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
