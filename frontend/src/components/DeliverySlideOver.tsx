'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, FileCheck, Calendar, Clock, CheckCircle2, AlertCircle, 
  User, Users, Building2, UploadCloud, FileText, History, MessageSquare, Paperclip, CheckSquare, Plus
} from 'lucide-react';
import { Portal } from '@/components/ui/Portal';

import { apiRequest } from '@/utils/api';
import { useParams } from 'next/navigation';

interface DeliverySlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: any;
  onStatusChanged?: () => void;
}

export default function DeliverySlideOver({ isOpen, onClose, delivery, onStatusChanged }: DeliverySlideOverProps) {
  const params = useParams();
  const tenantId = params.id as string;

  const [activeTab, setActiveTab] = useState<'details' | 'attachments' | 'history'>('details');
  const [loadingData, setLoadingData] = useState(false);
  
  const [status, setStatus] = useState('PREVISTA');
  const [checklists, setChecklists] = useState<any[]>([]);
  const [proofs, setProofs] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  
  const [newChecklist, setNewChecklist] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newProofUrl, setNewProofUrl] = useState('');
  const [newProofTitle, setNewProofTitle] = useState('');

  React.useEffect(() => {
    if (isOpen && delivery?.id) {
      setStatus(delivery.status);
      loadDetails();
    }
  }, [isOpen, delivery]);

  const loadDetails = async () => {
    setLoadingData(true);
    try {
      const data = await apiRequest(`/deliveries/${delivery.id}/details?tenantId=${tenantId}`);
      if (data) {
        setChecklists(data.checklists || []);
        setProofs(data.proofs || []);
        setHistory(data.history || []);
        setStatus(data.status || delivery.status);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const statusMap: Record<string, string> = { 'COMPLETED': 'CONCLUIDA', 'LATE': 'ANDAMENTO', 'PENDING': 'PREVISTA' };
    const mapped = statusMap[newStatus] || newStatus;
    
    try {
      await apiRequest(`/deliveries/${delivery.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ tenantId, status: mapped, authorName: 'Usuário Web' })
      });
      setStatus(mapped);
      if (onStatusChanged) onStatusChanged();
      loadDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklist.trim()) return;
    try {
      await apiRequest(`/deliveries/${delivery.id}/checklist`, {
        method: 'POST',
        body: JSON.stringify({ tenantId, description: newChecklist })
      });
      setNewChecklist('');
      loadDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleChecklist = async (itemId: string, isCompleted: boolean) => {
    try {
      // Optimistic update
      setChecklists(prev => prev.map(c => c.id === itemId ? { ...c, isCompleted } : c));
      await apiRequest(`/deliveries/${delivery.id}/checklist/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ tenantId, isCompleted })
      });
    } catch (err) {
      console.error(err);
      loadDetails(); // revert on fail
    }
  };

  const handleDeleteChecklist = async (itemId: string) => {
    try {
      await apiRequest(`/deliveries/${delivery.id}/checklist/${itemId}?tenantId=${tenantId}`, {
        method: 'DELETE'
      });
      loadDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProofTitle.trim() || !newProofUrl.trim()) return;
    try {
      await apiRequest(`/deliveries/${delivery.id}/proofs`, {
        method: 'POST',
        body: JSON.stringify({ tenantId, title: newProofTitle, url: newProofUrl, authorName: 'Usuário Web' })
      });
      setNewProofTitle('');
      setNewProofUrl('');
      loadDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProof = async (proofId: string) => {
    try {
      await apiRequest(`/deliveries/${delivery.id}/proofs/${proofId}?tenantId=${tenantId}`, {
        method: 'DELETE'
      });
      loadDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await apiRequest(`/deliveries/${delivery.id}/history`, {
        method: 'POST',
        body: JSON.stringify({ tenantId, description: newComment, authorName: 'Usuário Web' })
      });
      setNewComment('');
      loadDetails();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen || !delivery) return null;

  const tabs = [
    { id: 'details', label: 'Detalhes', icon: FileCheck },
    { id: 'attachments', label: 'Comprovantes', icon: Paperclip },
    { id: 'history', label: 'Histórico', icon: History },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
      case 'LATE': return 'text-rose-400 bg-rose-500/20 border-rose-500/30';
      default: return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Concluído';
      case 'LATE': return 'Atrasado';
      default: return 'Pendente';
    }
  };

  const StatusIcon = () => {
    switch (status) {
      case 'CONCLUIDA': return <CheckCircle2 className="w-10 h-10 text-emerald-300 drop-shadow-md" />;
      case 'INATIVA': 
      case 'LATE': return <AlertCircle className="w-10 h-10 text-rose-300 drop-shadow-md" />;
      default: return <Clock className="w-10 h-10 text-amber-300 drop-shadow-md" />;
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay with blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={onClose}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[100]"
            />

            {/* SlideOver Panel */}
            <motion.div 
              initial={{ x: '100%', opacity: 0.5, scale: 0.98 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: '100%', opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
              className="fixed inset-y-0 right-0 w-full sm:inset-y-2 sm:right-2 sm:w-[calc(100%-1rem)] max-w-2xl bg-slate-50/95 backdrop-blur-3xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] z-[110] flex flex-col border border-white/50 sm:rounded-[2.5rem] overflow-hidden"
            >
            {/* Header (Ultra Premium) */}
            <div className="relative bg-[#0A1A1E] p-8 sm:p-10 text-white shrink-0 overflow-hidden">
              {/* Dynamic Background Effects */}
              <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/noise-pattern-with-subtle-cross-lines.png')] opacity-[0.03] mix-blend-overlay"></div>
              
              {status === 'CONCLUIDA' && (
                <div className="absolute bottom-[-20%] left-[-10%] w-[80%] h-[80%] bg-gradient-to-tr from-emerald-500/20 via-transparent to-transparent blur-3xl pointer-events-none"></div>
              )}
              {status === 'LATE' && (
                <div className="absolute bottom-[-20%] left-[-10%] w-[80%] h-[80%] bg-gradient-to-tr from-rose-500/20 via-transparent to-transparent blur-3xl pointer-events-none"></div>
              )}
              {status !== 'CONCLUIDA' && status !== 'LATE' && (
                <div className="absolute bottom-[-20%] left-[-10%] w-[80%] h-[80%] bg-gradient-to-tr from-amber-500/20 via-transparent to-transparent blur-3xl pointer-events-none"></div>
              )}
              
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all hover:scale-105 active:scale-95 backdrop-blur-md z-20 group"
              >
                <X className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
              </button>

              <div className="relative z-10 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  {/* Glass Icon Box */}
                  <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                    <div className={`absolute inset-0 bg-gradient-to-tr to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                      status === 'CONCLUIDA' ? 'from-emerald-400/20' : 
                      status === 'LATE' ? 'from-rose-400/20' : 'from-amber-400/20'
                    }`}></div>
                    <StatusIcon />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm line-clamp-1">{delivery.name}</h2>
                      <div className="relative group/statuschange">
                        <span className={`px-3 py-1 cursor-pointer rounded-full text-[10px] font-black border uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.05)] ${getStatusColor(status === 'CONCLUIDA' ? 'COMPLETED' : status === 'LATE' ? 'LATE' : 'PENDING')}`}>
                          {status !== 'CONCLUIDA' && status !== 'LATE' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>}
                          {status}
                        </span>
                        
                        <div className="absolute left-0 top-full mt-2 w-32 bg-slate-800 border border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover/statuschange:opacity-100 group-hover/statuschange:visible transition-all z-20 overflow-hidden">
                          <button onClick={() => handleStatusChange('PENDING')} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700">PREVISTA</button>
                          <button onClick={() => handleStatusChange('LATE')} className="w-full text-left px-4 py-2 text-xs font-bold text-amber-400 hover:bg-slate-700">ANDAMENTO</button>
                          <button onClick={() => handleStatusChange('COMPLETED')} className="w-full text-left px-4 py-2 text-xs font-bold text-emerald-400 hover:bg-slate-700 border-t border-slate-700">CONCLUIDA</button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-300/80">
                      <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {delivery.client}
                      </span>
                      <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        Prazo: {delivery.deadline}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modern Pill Tabs */}
            <div className="px-4 sm:px-8 pt-6 pb-2 shrink-0 bg-white border-b border-slate-100">
              <div className="flex items-center p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/50 shadow-inner overflow-x-auto hide-scrollbar">
                {tabs.map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-bold rounded-xl transition-all duration-300 z-10 ${
                        isActive ? 'text-teal-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                      }`}
                    >
                      {isActive && (
                        <motion.div 
                          layoutId="activeTabDelivery" 
                          className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/50 -z-10"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <tab.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 bg-[#FAFAFA] hide-scrollbar relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -15, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="space-y-6 pb-10"
                >
                  
                  {/* === TAB 1: DETALHES === */}
                  {activeTab === 'details' && (
                    <div className="space-y-6">
                      
                      {/* Envolvidos */}
                      <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] overflow-hidden">
                        <div className="p-6 border-b border-slate-100/50 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100/50 flex items-center justify-center">
                            <Users className="w-5 h-5 text-teal-600" />
                          </div>
                          <h3 className="text-lg font-black text-slate-800 tracking-tight">Equipe Envolvida</h3>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="flex items-center gap-4 group">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                              <User className="w-6 h-6 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Responsável (Execução)</p>
                              <p className="text-sm font-bold text-slate-800">{delivery.responsible}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 group">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                              <User className="w-6 h-6 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Líder (Revisão)</p>
                              <p className="text-sm font-bold text-slate-800">Mariana Supervisora</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Descrição & Checklists */}
                      <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] overflow-hidden">
                        <div className="p-6 border-b border-slate-100/50 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100/50 flex items-center justify-center">
                            <CheckSquare className="w-5 h-5 text-teal-600" />
                          </div>
                          <h3 className="text-lg font-black text-slate-800 tracking-tight">Checklist Operacional</h3>
                        </div>
                        <div className="p-6 space-y-4">
                          {checklists.map((item) => (
                            <div key={item.id} className="flex items-start justify-between gap-3 group">
                              <div className="flex items-start gap-3 cursor-pointer flex-1" onClick={() => handleToggleChecklist(item.id, !item.isCompleted)}>
                                <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                                  item.isCompleted ? 'bg-teal-500 border-teal-600 text-white' : 'bg-slate-50 border-slate-300 group-hover:border-teal-400'
                                }`}>
                                  {item.isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                                </div>
                                <p className={`text-sm font-medium ${item.isCompleted ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                                  {item.description}
                                </p>
                              </div>
                              <button onClick={() => handleDeleteChecklist(item.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          
                          <form onSubmit={handleAddChecklist} className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                            <input 
                              type="text" 
                              value={newChecklist}
                              onChange={(e) => setNewChecklist(e.target.value)}
                              placeholder="Nova atividade..." 
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
                            />
                            <button type="submit" disabled={!newChecklist.trim()} className="bg-slate-900 hover:bg-teal-600 disabled:opacity-50 text-white p-2 rounded-xl transition-colors">
                              <Plus className="w-5 h-5" />
                            </button>
                          </form>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* === TAB 2: ANEXOS E COMPROVANTES === */}
                  {activeTab === 'attachments' && (
                    <div className="space-y-6">
                      
                      {/* Upload Area */}
                      <form onSubmit={handleAddProof} className="border-2 border-dashed border-teal-200/60 bg-teal-50/30 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 bg-white border border-teal-100 rounded-full flex items-center justify-center shadow-sm">
                          <UploadCloud className="w-8 h-8 text-teal-500" />
                        </div>
                        <p className="text-base font-black text-slate-800 tracking-tight text-center">Adicionar Link do Comprovante</p>
                        
                        <div className="w-full max-w-sm space-y-3">
                          <input 
                            type="text" 
                            placeholder="Título (ex: Guia ICMS.pdf)" 
                            value={newProofTitle}
                            onChange={(e) => setNewProofTitle(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
                          />
                          <input 
                            type="url" 
                            placeholder="URL do arquivo (Google Drive, Dropbox...)" 
                            value={newProofUrl}
                            onChange={(e) => setNewProofUrl(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
                          />
                          <button type="submit" disabled={!newProofTitle || !newProofUrl} className="w-full bg-slate-900 hover:bg-teal-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors">
                            Anexar Link
                          </button>
                        </div>
                      </form>

                      {/* Lista de Anexos */}
                      <div>
                        <h4 className="text-sm font-black text-slate-800 tracking-tight mb-4 flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-slate-400" />
                          Arquivos Anexados ({proofs.length})
                        </h4>
                        
                        <div className="space-y-3">
                          {proofs.map(proof => (
                            <div key={proof.id} className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center shrink-0">
                                  <FileText className="w-6 h-6 text-rose-500" />
                                </div>
                                <div>
                                  <a href={proof.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-slate-800 hover:text-teal-600 transition-colors">
                                    {proof.title}
                                  </a>
                                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">Adicionado por {proof.addedBy} • {new Date(proof.createdAt).toLocaleDateString('pt-BR')}</p>
                                </div>
                              </div>
                              <button onClick={() => handleDeleteProof(proof.id)} className="w-full sm:w-auto text-xs font-bold text-slate-500 hover:text-rose-500 px-3 py-1.5 bg-slate-50 hover:bg-rose-50 rounded-lg transition-colors">
                                Remover
                              </button>
                            </div>
                          ))}
                          {proofs.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-4">Nenhum comprovante anexado.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* === TAB 3: HISTÓRICO E TIMELINE === */}
                  {activeTab === 'history' && (
                    <div className="space-y-6">
                      
                      {/* Caixa de Comentário */}
                      <form onSubmit={handleAddHistory} className="bg-white p-5 rounded-[2rem] border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-teal-700" />
                          </div>
                          <div className="flex-1">
                            <textarea 
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Adicione um comentário, aviso ou registre uma pendência..." 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none h-24"
                            ></textarea>
                            <div className="flex justify-end mt-3">
                              <button type="submit" disabled={!newComment.trim()} className="w-full sm:w-auto px-5 py-2 bg-slate-900 disabled:opacity-50 hover:bg-teal-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md">
                                Enviar
                              </button>
                            </div>
                          </div>
                        </div>
                      </form>

                      {/* Timeline */}
                      <div className="pl-6 border-l-2 border-slate-100 space-y-8 mt-8 ml-4">
                        {history.map(item => (
                          <div key={item.id} className="relative">
                            <div className={`absolute -left-[35px] w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${
                              item.action === 'STATUS_CHANGED' ? 'bg-emerald-100' :
                              item.action === 'PROOF_ADDED' ? 'bg-blue-100' : 'bg-slate-100'
                            }`}>
                              {item.action === 'STATUS_CHANGED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              {item.action === 'PROOF_ADDED' && <Paperclip className="w-3 h-3 text-blue-600" />}
                              {item.action === 'COMMENT' && <MessageSquare className="w-3 h-3 text-slate-500" />}
                            </div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                              {new Date(item.createdAt).toLocaleDateString('pt-BR')} às {new Date(item.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                            </p>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                              <p className="text-sm text-slate-700">
                                <span className="font-bold">{item.authorName || 'Sistema'}</span> {item.description}
                              </p>
                            </div>
                          </div>
                        ))}
                        
                        {history.length === 0 && (
                          <p className="text-sm text-slate-400 text-center py-4">Nenhum histórico registrado.</p>
                        )}
                      </div>

                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
        )}
      </AnimatePresence>
    </Portal>
  );
}
