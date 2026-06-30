'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '@/utils/api';
import { 
  X, Users, Phone, Mail, 
  Calendar, Briefcase, 
  DollarSign, PieChart, Activity, Trash2, Plus, Loader2,
  UserCircle, MapPin, GraduationCap, Clock,
  Target, Award, CheckCircle2, ChevronRight, Star, Target as TargetIcon, Shield, Settings,
  Building2
} from 'lucide-react';
import FrontClassificationForm from './FrontClassificationForm';
import { Portal } from '@/components/ui/Portal';

interface Team360SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  member: any;
  tenantId?: string;
  cycleId?: string;
  onFrontRemoved?: () => void;
}

export default function Team360SlideOver({ isOpen, onClose, member, tenantId, cycleId, onFrontRemoved }: Team360SlideOverProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'operations'>('overview');
  const [memberFronts, setMemberFronts] = useState<any[]>([]);
  const [isLoadingFronts, setIsLoadingFronts] = useState(false);
  const [availableFronts, setAvailableFronts] = useState<any[]>([]);
  const [isAllocating, setIsAllocating] = useState(false);
  
  // New Allocation State
  const [isAllocatingFormOpen, setIsAllocatingFormOpen] = useState(false);
  const [selectedFront, setSelectedFront] = useState('');
  const [selectedSubdivision, setSelectedSubdivision] = useState('');
  const [allocatedHours, setAllocatedHours] = useState('8');
  const [predictableRecurrentTimePercentage, setPredictableRecurrentTimePercentage] = useState('');
  const [unpredictableRecurrentTimePercentage, setUnpredictableRecurrentTimePercentage] = useState('');
  const [allocationStartDate, setAllocationStartDate] = useState('');
  const [allocationEndDate, setAllocationEndDate] = useState('');

  useEffect(() => {
    if (isOpen && member && tenantId && cycleId) {
      loadMemberFronts();
    }
  }, [isOpen, member, tenantId, cycleId]);

  const loadMemberFronts = async () => {
    setIsLoadingFronts(true);
    try {
      const [data, frontsData] = await Promise.all([
        apiRequest(`/management-cycles/${cycleId}/team?tenantId=${tenantId}&employeeId=${member.employeeId}`),
        apiRequest(`/structures/fronts?tenantId=${tenantId}`)
      ]);
      setMemberFronts(data || []);
      setAvailableFronts(frontsData || []);
    } catch (err) {
      console.error('Failed to load team member fronts:', err);
    } finally {
      setIsLoadingFronts(false);
    }
  };

  const handleAllocateNewFront = async () => {
    if (!selectedFront) return;

    const prevPercent = predictableRecurrentTimePercentage ? parseFloat(predictableRecurrentTimePercentage.replace(',', '.')) : null;
    const unprevPercent = unpredictableRecurrentTimePercentage ? parseFloat(unpredictableRecurrentTimePercentage.replace(',', '.')) : null;

    if (prevPercent === null || unprevPercent === null || isNaN(prevPercent) || isNaN(unprevPercent)) {
      alert('Os percentuais de tempo recorrente previsível e não previsível são obrigatórios.');
      return;
    }

    if (prevPercent + unprevPercent !== 100) {
      alert('A soma do tempo recorrente previsível e não previsível deve ser exatamente 100%.');
      return;
    }

    setIsAllocating(true);
    try {
      await apiRequest(`/allocations`, {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          cycleId,
          employeeId: member.employeeId,
          frontId: selectedFront,
          subdivisionId: selectedSubdivision || null,
          dailyAvailableTime: Number(allocatedHours),
          status: 'ACTIVE',
          predictableRecurrentTimePercentage: prevPercent,
          unpredictableRecurrentTimePercentage: unprevPercent,
          allocationStartDate: allocationStartDate ? allocationStartDate : null,
          allocationEndDate: allocationEndDate ? allocationEndDate : null
        })
      });
      setSelectedFront('');
      setSelectedSubdivision('');
      setAllocatedHours('8');
      setPredictableRecurrentTimePercentage('');
      setUnpredictableRecurrentTimePercentage('');
      setAllocationStartDate('');
      setAllocationEndDate('');
      setIsAllocatingFormOpen(false);
      await loadMemberFronts();
      if (onFrontRemoved) onFrontRemoved();
    } catch (err: any) {
      alert(err.message || 'Erro ao alocar colaborador na nova frente');
    } finally {
      setIsAllocating(false);
    }
  };

  const handleRemoveFront = async (allocationId: string, frontName: string) => {
    if (!confirm(`Deseja desalocar o colaborador da frente ${frontName} neste mês?`)) {
      return;
    }
    
    try {
      await apiRequest(`/management-cycles/${cycleId}/team/${allocationId}?tenantId=${tenantId}`, {
        method: 'DELETE',
      });
      // reload this slide over
      await loadMemberFronts();
      // notify parent to reload the main table
      if (onFrontRemoved) onFrontRemoved();
    } catch (err: any) {
      alert(err.message || 'Erro ao remover colaborador do escopo');
    }
  };

  if (!isOpen || !member) return null;

  const employee = member.employee || {};

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: Activity },
    { id: 'operations', label: 'Operacional', icon: PieChart },
  ];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
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
                    <Users className="w-10 h-10 text-teal-300 drop-shadow-md" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-sm">{employee.name}</h2>
                      <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.15)] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        {employee.status === 'ACTIVE' ? 'Ativo' : employee.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-300/80">
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-teal-400/60" />
                        {employee.role || 'Colaborador'}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-teal-400/60" />
                        Alocado
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
                          layoutId="activeTabTeam" 
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
                  {/* === TAB 1: VISÃO GERAL === */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      
                      {/* Premium Metrics Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-white to-slate-50 p-5 rounded-[2rem] border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <DollarSign className="w-12 h-12 text-teal-600" />
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">Custo Total (Mês)</p>
                          <p className="text-2xl font-black text-slate-800 tracking-tight relative z-10">{formatCurrency(employee.grossSalary)}</p>
                        </div>
                        
                        <div className="bg-gradient-to-br from-white to-slate-50 p-5 rounded-[2rem] border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Briefcase className="w-12 h-12 text-blue-600" />
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">Cargo Declarado</p>
                          <p className="text-xl font-black text-slate-800 leading-tight relative z-10">{employee.role || 'Não Informado'}</p>
                        </div>
                      </div>

                      {/* Card: Detalhes Pessoais */}
                      <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] overflow-hidden">
                        <div className="p-6 border-b border-slate-100/50 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100/50 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-blue-600" />
                          </div>
                          <h3 className="text-lg font-black text-slate-800 tracking-tight">Detalhes Pessoais</h3>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-6 sm:gap-y-8 gap-x-6">
                          <div className="group">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                              E-mail Profissional
                            </p>
                            <p className="text-sm font-bold text-slate-700">{employee.email || 'Não informado'}</p>
                          </div>
                          <div className="group">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                              Nível
                            </p>
                            <p className="text-sm font-bold text-slate-700">{employee.level || 'Não informado'}</p>
                          </div>
                          <div className="group">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                              Status Global
                            </p>
                            <p className="text-sm font-bold text-slate-700">{employee.status === 'ACTIVE' ? 'Ativo' : employee.status === 'INACTIVE' ? 'Inativo' : employee.status || 'Não informado'}</p>
                          </div>
                          
                          <div className="group col-span-2 pt-2 border-t border-slate-100/50">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                              Observações
                            </p>
                            <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                              {employee.observations || 'Nenhuma observação cadastrada.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* === TAB 2: OPERACIONAL === */}
                  {activeTab === 'operations' && (
                    <div className="space-y-6">
                      <div className="p-6 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-[2rem] shadow-lg shadow-teal-500/20 text-white relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center gap-5">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                        <div className="w-14 h-14 bg-white/20 border border-white/30 rounded-[1.2rem] flex items-center justify-center backdrop-blur-md shrink-0 z-10">
                          <PieChart className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-black tracking-tight">Escopos Alocados</h4>
                          <p className="text-sm text-teal-50 font-medium mt-1 opacity-90 max-w-md">
                            Visão panorâmica da alocação de tempo deste colaborador nas frentes do escritório.
                          </p>
                        </div>
                        <button 
                          onClick={() => setIsAllocatingFormOpen(!isAllocatingFormOpen)}
                          className="w-full sm:w-auto bg-white text-teal-700 font-bold px-4 py-2 rounded-xl text-sm shadow-md hover:bg-teal-50 transition-colors flex items-center justify-center gap-2 z-10"
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
                                    {availableFronts.filter(f => !memberFronts.some(mf => mf.frontId === f.id)).map(f => (
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
                                <div className="sm:col-span-2">
                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Horas Alocadas (Por Dia) *</label>
                                  <input
                                    type="number"
                                    value={allocatedHours}
                                    onChange={(e) => setAllocatedHours(e.target.value)}
                                    required
                                    min="1"
                                    max="24"
                                    className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm font-medium"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2" title="Atividades Recorrentes Previsíveis">Temp. Recorr. Prev. (%)</label>
                                  <input
                                    type="number"
                                    value={predictableRecurrentTimePercentage}
                                    onChange={(e) => setPredictableRecurrentTimePercentage(e.target.value)}
                                    required
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    placeholder="Ex: 50"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2" title="Atividades Recorrentes Não Previsíveis">Temp. Recorr. Não Prev. (%)</label>
                                  <input
                                    type="number"
                                    value={unpredictableRecurrentTimePercentage}
                                    onChange={(e) => setUnpredictableRecurrentTimePercentage(e.target.value)}
                                    required
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    placeholder="Ex: 20"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Data Início Alocação</label>
                                  <input
                                    type="date"
                                    value={allocationStartDate}
                                    onChange={(e) => setAllocationStartDate(e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Data Fim Alocação</label>
                                  <input
                                    type="date"
                                    value={allocationEndDate}
                                    onChange={(e) => setAllocationEndDate(e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm font-medium"
                                  />
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                                <button
                                  onClick={() => setIsAllocatingFormOpen(false)}
                                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={handleAllocateNewFront}
                                  disabled={!selectedFront || isAllocating}
                                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                      ) : memberFronts.length === 0 ? (
                        <div className="py-10 text-center text-slate-500">Nenhum escopo operacional mapeado.</div>
                      ) : (
                        memberFronts.map((frontAlloc, index) => (
                        <div key={index} className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] group hover:border-teal-200 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-8 rounded-full bg-teal-500"></div>
                              <h4 className="text-lg font-black text-slate-800 tracking-tight">{frontAlloc.frontName || 'Frente'}</h4>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Alocado
                              </span>
                              <button
                                onClick={() => handleRemoveFront(frontAlloc.id, frontAlloc.frontName || 'Frente')}
                                className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100"
                                title="Desalocar Frente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                  <Activity className="w-3.5 h-3.5" /> Horas Diárias Alocadas
                                </p>
                                <p className="text-sm font-black text-slate-800">{frontAlloc.allocatedHours}h / dia</p>
                              </div>
                              <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5" /> Período
                                </p>
                                <p className="text-sm font-black text-slate-800">
                                  {frontAlloc.allocationStartDate ? new Date(frontAlloc.allocationStartDate).toLocaleDateString('pt-BR') : '-'} até {frontAlloc.allocationEndDate ? new Date(frontAlloc.allocationEndDate).toLocaleDateString('pt-BR') : '-'}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200/60">
                              <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                  <PieChart className="w-3.5 h-3.5" /> Recorrente Prev.
                                </p>
                                <p className="text-sm font-black text-slate-800">{frontAlloc.predictableRecurrentTimePercentage || '0'}%</p>
                              </div>
                              <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                  <PieChart className="w-3.5 h-3.5" /> Recorrente Não Prev.
                                </p>
                                <p className="text-sm font-black text-slate-800">{frontAlloc.unpredictableRecurrentTimePercentage || '0'}%</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        ))
                      )}
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
