'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '@/utils/api';
import { 
  X, Building2, MapPin, Phone, Mail, 
  Calendar, FileText, CheckCircle2, AlertCircle, 
  Clock, DollarSign, PieChart, Users, TrendingUp, CreditCard,
  Briefcase, Activity, Sparkles, ChevronRight, Trash2, Plus, Loader2, Settings
} from 'lucide-react';
import FrontClassificationForm from './FrontClassificationForm';

interface Client360SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  client: any;
  tenantId?: string;
  cycleId?: string;
  onFrontRemoved?: () => void;
}

export default function Client360SlideOver({ isOpen, onClose, client, tenantId, cycleId, onFrontRemoved }: Client360SlideOverProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'deliveries' | 'financial'>('overview');
  const [clientFronts, setClientFronts] = useState<any[]>([]);
  const [isLoadingFronts, setIsLoadingFronts] = useState(false);
  const [availableFronts, setAvailableFronts] = useState<any[]>([]);
  const [isAllocating, setIsAllocating] = useState(false);
  
  // New Allocation State
  const [isAllocatingFormOpen, setIsAllocatingFormOpen] = useState(false);
  const [selectedFront, setSelectedFront] = useState('');
  const [selectedSubdivision, setSelectedSubdivision] = useState('');
  const [classificationData, setClassificationData] = useState<any>({});
  
  const [editingFrontId, setEditingFrontId] = useState<string | null>(null);
  const [editingClassificationData, setEditingClassificationData] = useState<any>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    if (isOpen && client && tenantId && cycleId) {
      loadClientFronts();
    }
  }, [isOpen, client, tenantId, cycleId]);

  const loadClientFronts = async () => {
    setIsLoadingFronts(true);
    try {
      const [data, frontsData] = await Promise.all([
        apiRequest(`/management-cycles/${cycleId}/clients?tenantId=${tenantId}&clientId=${client.id}`),
        apiRequest(`/structures/fronts?tenantId=${tenantId}`)
      ]);
      setClientFronts(data || []);
      setAvailableFronts(frontsData || []);
    } catch (err) {
      console.error('Failed to load client fronts:', err);
    } finally {
      setIsLoadingFronts(false);
    }
  };

  const handleAllocateNewFront = async () => {
    if (!selectedFront) return;
    setIsAllocating(true);
    try {
      if (Object.keys(classificationData).length > 0) {
        await apiRequest(`/clients/${client.id}/fronts/${selectedFront}/classification`, {
          method: 'PUT',
          body: JSON.stringify({ ...classificationData, tenantId })
        });
      }

      await apiRequest(`/management-cycles/${cycleId}/clients`, {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          clientId: client.id,
          frontId: selectedFront,
          subdivisionId: selectedSubdivision || null
        })
      });
      setSelectedFront('');
      setSelectedSubdivision('');
      setClassificationData({});
      setIsAllocatingFormOpen(false);
      await loadClientFronts();
      if (onFrontRemoved) onFrontRemoved();
    } catch (err: any) {
      alert(err.message || 'Erro ao alocar cliente na nova frente');
    } finally {
      setIsAllocating(false);
    }
  };

  const handleEditFrontClick = async (frontId: string) => {
    setEditingFrontId(frontId);
    setEditingClassificationData({});
    try {
      const data = await apiRequest(`/clients/${client.id}/fronts/${frontId}/classification?tenantId=${tenantId}`);
      if (data && data.classification) {
        const mergedData = {
          ...data.classification,
          taxInfo: data.taxInfo || {},
          hrInfo: data.hrInfo || {},
          accountingInfo: data.accountingInfo || {}
        };
        setEditingClassificationData(mergedData);
      }
    } catch (err) {
      console.error('Erro ao buscar classificação:', err);
    }
  };

  const handleSaveFrontEdit = async () => {
    if (!editingFrontId) return;
    setIsSavingEdit(true);
    try {
      await apiRequest(`/clients/${client.id}/fronts/${editingFrontId}/classification`, {
        method: 'PUT',
        body: JSON.stringify({ ...editingClassificationData, tenantId })
      });

      const frontSnap = clientFronts.find((f: any) => f.frontId === editingFrontId);
      if (frontSnap?.snapshotId) {
        await apiRequest(`/management-cycles/${cycleId}/clients/${frontSnap.snapshotId}`, {
          method: 'PUT',
          body: JSON.stringify({ ...editingClassificationData, tenantId })
        });
      }

      setEditingFrontId(null);
      setEditingClassificationData({});
      await loadClientFronts();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar alterações');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleRemoveFront = async (snapshotId: string, frontName: string) => {
    if (!confirm(`Deseja desalocar o cliente da frente ${frontName} neste mês?\nA classificação dele também será desligada globalmente para os próximos meses.`)) {
      return;
    }
    
    try {
      await apiRequest(`/management-cycles/${cycleId}/clients/${snapshotId}?tenantId=${tenantId}`, {
        method: 'DELETE',
      });
      // reload this slide over
      await loadClientFronts();
      // notify parent to reload the main table
      if (onFrontRemoved) onFrontRemoved();
    } catch (err: any) {
      alert(err.message || 'Erro ao remover cliente do escopo');
    }
  };

  if (!isOpen || !client) return null;

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: Activity },
    { id: 'operations', label: 'Operacional', icon: Users },
    { id: 'deliveries', label: 'Entregas', icon: CheckCircle2 },
    { id: 'financial', label: 'Financeiro', icon: DollarSign },
  ];

  // Mockup data for Deliveries
  const mockDeliveries = [
    { id: 1, name: 'Folha de Pagamento', deadline: '05/06/2026', status: 'Concluído', type: 'DP' },
    { id: 2, name: 'Apuração Simples Nacional', deadline: '20/06/2026', status: 'Pendente', type: 'Fiscal' },
    { id: 3, name: 'Fechamento Contábil', deadline: '15/06/2026', status: 'Atrasado', type: 'Contábil' },
  ];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay with blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
          />

          {/* SlideOver Panel */}
          <motion.div 
            initial={{ x: '100%', opacity: 0.5, scale: 0.98 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: '100%', opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className="fixed inset-y-2 right-2 w-full max-w-2xl bg-slate-50/95 backdrop-blur-3xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] z-50 flex flex-col border border-white/50 rounded-[2.5rem] overflow-hidden"
          >
            {/* Header (Ultra Premium) */}
            <div className="relative bg-[#0A1A1E] p-8 sm:p-10 text-white shrink-0 overflow-hidden">
              {/* Dynamic Background Effects */}
              <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/noise-pattern-with-subtle-cross-lines.png')] opacity-[0.03] mix-blend-overlay"></div>
              <div className="absolute top-[-20%] right-[-10%] w-[120%] h-[120%] bg-gradient-to-bl from-teal-500/20 via-transparent to-transparent blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-[-20%] left-[-10%] w-[80%] h-[80%] bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent blur-3xl pointer-events-none"></div>
              
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
                    <div className="absolute inset-0 bg-gradient-to-tr from-teal-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <Building2 className="w-10 h-10 text-teal-300 drop-shadow-md" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-sm">{client.name}</h2>
                      <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.15)] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        {client.status === 'ACTIVE' ? 'Ativo' : client.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-300/80">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-teal-400/60" />
                        CNPJ: {client.cnpj?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') || '-'}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-teal-400/60" />
                        Cliente desde 2026
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modern Pill Tabs */}
            <div className="px-8 pt-6 pb-2 shrink-0 bg-white border-b border-slate-100">
              <div className="flex items-center p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/50 shadow-inner">
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
                          layoutId="activeTab" 
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
            <div className="flex-1 overflow-y-auto px-8 py-6 bg-[#FAFAFA] hide-scrollbar relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -15, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="space-y-6 pb-10"
                >
                  {/* === TAB 1: VISÃO GERAL === */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      
                      {/* Premium Metrics Row */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-white to-slate-50 p-5 rounded-[2rem] border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <DollarSign className="w-12 h-12 text-teal-600" />
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">Honorários</p>
                          <p className="text-2xl font-black text-slate-800 tracking-tight relative z-10">{formatCurrency(client.monthlyFee)}</p>
                        </div>
                        
                        <div className="bg-gradient-to-br from-white to-slate-50 p-5 rounded-[2rem] border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Briefcase className="w-12 h-12 text-blue-600" />
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">Regime Tributário</p>
                          <p className="text-base font-black text-slate-800 leading-tight relative z-10">{client.taxRegime?.replace('_', ' ') || 'Não Informado'}</p>
                        </div>

                        <div className="bg-gradient-to-br from-white to-slate-50 p-5 rounded-[2rem] border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Curva ABC</p>
                          <div className="mt-auto">
                            <span className="inline-flex w-12 h-12 rounded-[1rem] bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-700 items-center justify-center font-black text-xl border border-indigo-100/50 shadow-sm">
                              {client.classification || 'B'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card: Dados Cadastrais */}
                      <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] overflow-hidden">
                        <div className="p-6 border-b border-slate-100/50 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100/50 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-teal-600" />
                          </div>
                          <h3 className="text-lg font-black text-slate-800 tracking-tight">Dados Cadastrais</h3>
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-y-8 gap-x-6">
                          <div className="group">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                              Nome Fantasia
                            </p>
                            <p className="text-sm font-bold text-slate-700">{client.tradeName || 'Não informado'}</p>
                          </div>
                          <div className="group">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                              Segmento
                            </p>
                            <p className="text-sm font-bold text-slate-700">{client.segment || 'Geral'}</p>
                          </div>
                          <div className="group">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                              Faixa de Faturamento
                            </p>
                            <p className="text-sm font-bold text-slate-700">{client.revenueBracket || 'Não informada'}</p>
                          </div>
                          <div className="group">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                              Grupo Empresarial
                            </p>
                            <p className="text-sm font-bold text-slate-700">{client.hasEconomicGroup ? client.economicGroupName || 'Sim' : 'Não'}</p>
                          </div>
                          
                          {client.observations && (
                            <div className="group col-span-2 pt-2 border-t border-slate-100/50">
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                Observações Cadastrais
                              </p>
                              <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                {client.observations}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card: Contato e Endereço */}
                      <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] overflow-hidden">
                        <div className="p-6 border-b border-slate-100/50 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100/50 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-blue-600" />
                          </div>
                          <h3 className="text-lg font-black text-slate-800 tracking-tight">Contato e Endereço</h3>
                        </div>
                        <div className="p-6 space-y-6">
                          <div className="flex items-center gap-4 group">
                            <div className="w-12 h-12 rounded-[1rem] bg-slate-50 flex items-center justify-center border border-slate-200/60 group-hover:bg-teal-50 group-hover:border-teal-100 group-hover:text-teal-600 transition-colors">
                              <Mail className="w-5 h-5 text-slate-400 group-hover:text-teal-500 transition-colors" />
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-0.5">E-mail Principal</p>
                              <p className="text-sm font-bold text-slate-700">{client.email || 'contato@cliente.com.br'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 group">
                            <div className="w-12 h-12 rounded-[1rem] bg-slate-50 flex items-center justify-center border border-slate-200/60 group-hover:bg-teal-50 group-hover:border-teal-100 group-hover:text-teal-600 transition-colors">
                              <Phone className="w-5 h-5 text-slate-400 group-hover:text-teal-500 transition-colors" />
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Telefone</p>
                              <p className="text-sm font-bold text-slate-700">{client.phone || '(11) 99999-9999'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 group">
                            <div className="w-12 h-12 rounded-[1rem] bg-slate-50 flex items-center justify-center border border-slate-200/60 group-hover:bg-teal-50 group-hover:border-teal-100 group-hover:text-teal-600 transition-colors">
                              <MapPin className="w-5 h-5 text-slate-400 group-hover:text-teal-500 transition-colors" />
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Endereço Completo</p>
                              <p className="text-sm font-bold text-slate-700 leading-snug max-w-md">{client.address || 'Av. Paulista, 1000'} - {client.city || 'São Paulo'} / {client.state || 'SP'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* === TAB 2: OPERACIONAL === */}
                  {activeTab === 'operations' && (
                    <div className="space-y-6">
                      <div className="p-6 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-[2rem] shadow-lg shadow-teal-500/20 text-white relative overflow-hidden flex items-center gap-5">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                        <div className="w-14 h-14 bg-white/20 border border-white/30 rounded-[1.2rem] flex items-center justify-center backdrop-blur-md shrink-0 z-10">
                          <PieChart className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-black tracking-tight">Mapeamento de Escopo</h4>
                          <p className="text-sm text-teal-50 font-medium mt-1 opacity-90 max-w-md">
                            Visão panorâmica da complexidade e atuação do cliente nas diferentes frentes de negócio do escritório.
                          </p>
                        </div>
                        <button 
                          onClick={() => setIsAllocatingFormOpen(!isAllocatingFormOpen)}
                          className="bg-white text-teal-700 font-bold px-4 py-2 rounded-xl text-sm shadow-md hover:bg-teal-50 transition-colors flex items-center gap-2 z-10"
                        >
                          <Plus className="w-4 h-4" /> Alocar Frente
                        </button>
                      </div>

                      <AnimatePresence>
                        {isAllocatingFormOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-6 bg-slate-100/50 rounded-2xl border border-slate-200">
                              <h5 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Plus className="w-4 h-4 text-teal-600" /> Nova Alocação
                              </h5>
                              <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Frente de Negócio *</label>
                                  <select
                                    value={selectedFront}
                                    onChange={(e) => {
                                      setSelectedFront(e.target.value);
                                      setSelectedSubdivision('');
                                    }}
                                    className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm font-medium"
                                  >
                                    <option value="">Selecione uma Frente</option>
                                    {availableFronts.filter(f => !clientFronts.some(cf => cf.frontId === f.id)).map(f => (
                                      <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                  </select>
                                </div>
                                {selectedFront && availableFronts.find(f => f.id === selectedFront)?.subdivisions?.length > 0 && (
                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Célula (Opcional)</label>
                                    <select
                                      value={selectedSubdivision}
                                      onChange={(e) => setSelectedSubdivision(e.target.value)}
                                      className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm font-medium"
                                    >
                                      <option value="">Selecione uma Célula</option>
                                      {availableFronts.find(f => f.id === selectedFront)?.subdivisions.map((sub: any) => (
                                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                              
                              {selectedFront && (
                                <FrontClassificationForm 
                                  tenantId={tenantId || ''} 
                                  frontName={availableFronts.find(f => f.id === selectedFront)?.name || ''} 
                                  value={classificationData} 
                                  onChange={setClassificationData} 
                                />
                              )}

                              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200/60">
                                <button
                                  onClick={() => setIsAllocatingFormOpen(false)}
                                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={handleAllocateNewFront}
                                  disabled={!selectedFront || isAllocating}
                                  className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                  {isAllocating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Alocação'}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {isLoadingFronts ? (
                        <div className="py-10 text-center text-slate-500">Carregando escopos...</div>
                      ) : clientFronts.length === 0 ? (
                        <div className="py-10 text-center text-slate-500">Nenhum escopo operacional mapeado.</div>
                      ) : (
                        clientFronts.map((frontSnap, index) => (
                        <div key={index} className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] group hover:border-teal-200 transition-colors">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-8 rounded-full bg-teal-500"></div>
                              <h4 className="text-lg font-black text-slate-800 tracking-tight">{frontSnap.frontName || 'Frente'}</h4>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Escopo Ativo
                              </span>
                              <button
                                onClick={() => handleEditFrontClick(frontSnap.frontId)}
                                className="p-2 text-slate-400 hover:text-teal-600 transition-colors rounded-xl hover:bg-teal-50 border border-transparent hover:border-teal-100"
                                title="Editar Configurações da Frente"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemoveFront(frontSnap.snapshotId, frontSnap.frontName || 'Frente')}
                                className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100"
                                title="Desalocar Frente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {editingFrontId === frontSnap.frontId ? (
                            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 mt-4">
                              <div className="flex items-center justify-between mb-4">
                                <h5 className="font-bold text-slate-800 flex items-center gap-2">
                                  <Settings className="w-4 h-4 text-teal-600" /> Editar Parâmetros: {frontSnap.frontName}
                                </h5>
                                <button onClick={() => setEditingFrontId(null)} className="text-slate-400 hover:text-slate-600">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <FrontClassificationForm 
                                tenantId={tenantId || ''} 
                                frontName={frontSnap.frontName || ''} 
                                value={editingClassificationData} 
                                onChange={setEditingClassificationData} 
                              />
                              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200/60 justify-end">
                                <button
                                  onClick={() => setEditingFrontId(null)}
                                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={handleSaveFrontEdit}
                                  disabled={isSavingEdit}
                                  className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                  {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Alterações'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-8 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                              <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                  <Activity className="w-3.5 h-3.5" /> Nível de Complexidade
                                </p>
                                <div className="flex gap-1.5">
                                {[1, 2, 3].map((level) => {
                                  const isActive = level <= (frontSnap.complexity || 1);
                                  return (
                                    <div key={level} className={`h-2.5 w-full rounded-full ${isActive ? 'bg-gradient-to-r from-teal-400 to-teal-500 shadow-sm shadow-teal-500/20' : 'bg-slate-200/60'}`}></div>
                                  );
                                })}
                              </div>
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" /> Frequência
                              </p>
                              <p className="text-sm font-black text-slate-800">{frontSnap.frequency || 'Mensal'}</p>
                            </div>
                          </div>
                          )}
                        </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* === TAB 3: ENTREGAS === */}
                  {activeTab === 'deliveries' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <h3 className="text-base font-black text-slate-800 tracking-tight">Obrigações deste Mês</h3>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">Visão consolidada de todas as áreas</p>
                          </div>
                        </div>
                        <button className="text-sm font-bold text-white bg-slate-900 hover:bg-teal-600 px-4 py-2 rounded-xl transition-colors flex items-center gap-2 shadow-md">
                          Calendário Completo <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        {mockDeliveries.map((delivery) => (
                          <div key={delivery.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] flex items-center justify-between hover:border-teal-300 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group">
                            <div className="flex items-center gap-5">
                              <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center border-2 ${
                                delivery.status === 'Concluído' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                                delivery.status === 'Atrasado' ? 'bg-rose-50 border-rose-200 text-rose-600' :
                                'bg-amber-50 border-amber-200 text-amber-500'
                              }`}>
                                {delivery.status === 'Concluído' ? <CheckCircle2 className="w-6 h-6" /> :
                                 delivery.status === 'Atrasado' ? <AlertCircle className="w-6 h-6" /> :
                                 <Clock className="w-6 h-6" />}
                              </div>
                              <div>
                                <p className="text-base font-black text-slate-800 group-hover:text-teal-700 transition-colors tracking-tight">{delivery.name}</p>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 opacity-70" /> {delivery.deadline}
                                  </span>
                                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {delivery.type}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <span className={`text-[11px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-xl border ${
                              delivery.status === 'Concluído' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              delivery.status === 'Atrasado' ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.15)]' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {delivery.status}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-8 p-10 border-2 border-dashed border-slate-200/80 bg-slate-50/50 rounded-[2rem] text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm mb-4">
                          <Sparkles className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-base font-black text-slate-700">Tudo em dia por enquanto!</p>
                        <p className="text-sm text-slate-500 mt-1 max-w-sm">Não há novas obrigações mapeadas para este cliente no momento. Volte mais tarde.</p>
                      </div>
                    </div>
                  )}

                  {/* === TAB 4: FINANCEIRO === */}
                  {activeTab === 'financial' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-5">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-[2rem] shadow-lg shadow-emerald-500/20 text-white relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                            <CheckCircle2 className="w-16 h-16" />
                          </div>
                          <p className="text-[11px] font-black text-emerald-100 uppercase tracking-widest mb-1 relative z-10">Status Financeiro</p>
                          <p className="text-3xl font-black text-white relative z-10 tracking-tight">Adimplente</p>
                        </div>
                        
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <TrendingUp className="w-16 h-16 text-slate-900" />
                          </div>
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Faturamento YTD</p>
                          <p className="text-3xl font-black text-slate-800 tracking-tight">{formatCurrency(client.monthlyFee * 6)}</p>
                        </div>
                      </div>

                      <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] overflow-hidden">
                        <div className="p-6 border-b border-slate-100/50 flex items-center justify-between">
                          <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100/50">
                              <CreditCard className="w-5 h-5 text-blue-600" />
                            </div>
                            Histórico de Faturas
                          </h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {[
                            { month: 'Junho/2026', status: 'Aberto', date: '10/06/2026' },
                            { month: 'Maio/2026', status: 'Pago', date: '10/05/2026' },
                            { month: 'Abril/2026', status: 'Pago', date: '10/04/2026' },
                            { month: 'Março/2026', status: 'Pago', date: '10/03/2026' },
                          ].map((fatura, idx) => (
                            <div key={idx} className="p-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors group">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center ${
                                  fatura.status === 'Pago' ? 'bg-emerald-50/50 border-emerald-100/50 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'
                                }`}>
                                  <span className="text-[10px] font-black uppercase">{fatura.month.split('/')[0].substring(0,3)}</span>
                                </div>
                                <div>
                                  <p className="text-sm font-black text-slate-800">{fatura.month}</p>
                                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">Vencimento: {fatura.date}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <p className="text-base font-black text-slate-800">{formatCurrency(client.monthlyFee)}</p>
                                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                                  fatura.status === 'Pago' 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {fatura.status}
                                </span>
                              </div>
                            </div>
                          ))}
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
  );
}
