'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, FileCheck, Calendar, Clock, CheckCircle2, AlertCircle, 
  User, Users, Building2, UploadCloud, FileText, History, MessageSquare, Paperclip, CheckSquare, Plus
} from 'lucide-react';
import { Portal } from '@/components/ui/Portal';

interface DeliverySlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: any;
}

export default function DeliverySlideOver({ isOpen, onClose, delivery }: DeliverySlideOverProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'attachments' | 'history'>('details');

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
    switch (delivery.status) {
      case 'COMPLETED': return <CheckCircle2 className="w-10 h-10 text-emerald-300 drop-shadow-md" />;
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
              
              {delivery.status === 'COMPLETED' && (
                <div className="absolute bottom-[-20%] left-[-10%] w-[80%] h-[80%] bg-gradient-to-tr from-emerald-500/20 via-transparent to-transparent blur-3xl pointer-events-none"></div>
              )}
              {delivery.status === 'LATE' && (
                <div className="absolute bottom-[-20%] left-[-10%] w-[80%] h-[80%] bg-gradient-to-tr from-rose-500/20 via-transparent to-transparent blur-3xl pointer-events-none"></div>
              )}
              {delivery.status === 'PENDING' && (
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
                      delivery.status === 'COMPLETED' ? 'from-emerald-400/20' : 
                      delivery.status === 'LATE' ? 'from-rose-400/20' : 'from-amber-400/20'
                    }`}></div>
                    <StatusIcon />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm line-clamp-1">{delivery.name}</h2>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.05)] ${getStatusColor(delivery.status)}`}>
                        {delivery.status === 'PENDING' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>}
                        {getStatusLabel(delivery.status)}
                      </span>
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
                          {[
                            { text: 'Extrair notas fiscais do portal da prefeitura', done: true },
                            { text: 'Importar XMLs no sistema fiscal', done: true },
                            { text: 'Validar advertências e erros no PVA', done: delivery.status === 'COMPLETED' },
                            { text: 'Gerar e anexar Guia de Pagamento', done: delivery.status === 'COMPLETED' },
                          ].map((item, idx) => (
                            <div key={idx} className="flex items-start gap-3 group cursor-pointer">
                              <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                                item.done ? 'bg-teal-500 border-teal-600 text-white' : 'bg-slate-50 border-slate-300 group-hover:border-teal-400'
                              }`}>
                                {item.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </div>
                              <p className={`text-sm font-medium ${item.done ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                                {item.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* === TAB 2: ANEXOS E COMPROVANTES === */}
                  {activeTab === 'attachments' && (
                    <div className="space-y-6">
                      
                      {/* Upload Area */}
                      <div className="border-2 border-dashed border-teal-200/60 bg-teal-50/30 hover:bg-teal-50/80 transition-colors rounded-[2rem] p-10 flex flex-col items-center justify-center cursor-pointer group">
                        <div className="w-16 h-16 bg-white border border-teal-100 rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                          <UploadCloud className="w-8 h-8 text-teal-500" />
                        </div>
                        <p className="text-base font-black text-slate-800 tracking-tight">Arraste seus comprovantes aqui</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs text-center">Arquivos PDF, JPG ou PNG de até 10MB suportados.</p>
                        <button className="mt-4 px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:text-teal-600 hover:border-teal-200 shadow-sm transition-all">
                          Buscar no Computador
                        </button>
                      </div>

                      {/* Lista de Anexos */}
                      <div>
                        <h4 className="text-sm font-black text-slate-800 tracking-tight mb-4 flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-slate-400" />
                          Arquivos Anexados (1)
                        </h4>
                        
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center shrink-0">
                              <FileText className="w-6 h-6 text-rose-500" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 group-hover:text-teal-600 transition-colors">guia_icms_062026.pdf</p>
                              <p className="text-[11px] font-medium text-slate-400 mt-0.5">Adicionado por Ana Analista • 145 KB</p>
                            </div>
                          </div>
                          <button className="w-full sm:w-auto text-xs font-bold text-slate-500 hover:text-rose-500 px-3 py-1.5 bg-slate-50 hover:bg-rose-50 rounded-lg transition-colors">
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* === TAB 3: HISTÓRICO E TIMELINE === */}
                  {activeTab === 'history' && (
                    <div className="space-y-6">
                      
                      {/* Caixa de Comentário */}
                      <div className="bg-white p-5 rounded-[2rem] border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-teal-700" />
                          </div>
                          <div className="flex-1">
                            <textarea 
                              placeholder="Adicione um comentário, aviso ou registre uma pendência..." 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none h-24"
                            ></textarea>
                            <div className="flex justify-end mt-3">
                              <button className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-teal-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md">
                                Enviar
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Timeline Oculta */}
                      <div className="pl-6 border-l-2 border-slate-100 space-y-8 mt-8 ml-4">
                        <div className="relative">
                          <div className="absolute -left-[35px] w-6 h-6 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center shadow-sm">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          </div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Há 2 horas</p>
                          <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                            <p className="text-sm text-slate-700"><span className="font-bold">Ana Analista</span> alterou o status para <span className="font-bold text-emerald-600">Concluído</span>.</p>
                          </div>
                        </div>

                        <div className="relative">
                          <div className="absolute -left-[35px] w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center shadow-sm">
                            <Paperclip className="w-3 h-3 text-blue-600" />
                          </div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Há 3 horas</p>
                          <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                            <p className="text-sm text-slate-700"><span className="font-bold">Ana Analista</span> anexou o arquivo <span className="font-bold text-slate-900">guia_icms_062026.pdf</span>.</p>
                          </div>
                        </div>

                        <div className="relative">
                          <div className="absolute -left-[35px] w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center shadow-sm">
                            <Plus className="w-3 h-3 text-slate-500" />
                          </div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Há 5 dias</p>
                          <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                            <p className="text-sm text-slate-700"><span className="font-bold">Sistema</span> gerou a obrigação automaticamente com base na regra fiscal do cliente.</p>
                          </div>
                        </div>
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
