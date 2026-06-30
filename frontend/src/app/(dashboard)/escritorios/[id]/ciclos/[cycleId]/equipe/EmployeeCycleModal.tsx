import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';

import { Portal } from '@/components/ui/Portal';

interface EmployeeCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  cycleId: string;
  onSuccess: () => void;
}

export default function EmployeeCycleModal({ isOpen, onClose, tenantId, cycleId, onSuccess }: EmployeeCycleModalProps) {
  const [fronts, setFronts] = useState<any[]>([]);
  const [subdivisions, setSubdivisions] = useState<any[]>([]);
  
  // Employee Data
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [level, setLevel] = useState('');
  const [email, setEmail] = useState('');
  const [grossSalary, setGrossSalary] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [observations, setObservations] = useState('');
  
  // Allocation Data
  const [selectedFront, setSelectedFront] = useState('');
  const [selectedSubdivision, setSelectedSubdivision] = useState('');
  const [allocatedHours, setAllocatedHours] = useState('8');
  const [predictableRecurrentTimePercentage, setPredictableRecurrentTimePercentage] = useState('');
  const [unpredictableRecurrentTimePercentage, setUnpredictableRecurrentTimePercentage] = useState('');
  const [allocationStartDate, setAllocationStartDate] = useState('');
  const [allocationEndDate, setAllocationEndDate] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFronts();
    } else {
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedFront) {
      const front = fronts.find(f => f.id === selectedFront);
      setSubdivisions(front?.subdivisions || []);
      setSelectedSubdivision('');
    } else {
      setSubdivisions([]);
    }
  }, [selectedFront]);

  const loadFronts = async () => {
    setIsFetching(true);
    try {
      const data = await apiRequest(`/structures/fronts?tenantId=${tenantId}`);
      setFronts(data || []);
    } catch (err) {
      console.error('Error fetching fronts:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const resetForm = () => {
    setName('');
    setRole('');
    setLevel('');
    setEmail('');
    setGrossSalary('');
    setStatus('ACTIVE');
    setObservations('');
    setSelectedFront('');
    setSelectedSubdivision('');
    setAllocatedHours('8');
    setPredictableRecurrentTimePercentage('');
    setUnpredictableRecurrentTimePercentage('');
    setAllocationStartDate('');
    setAllocationEndDate('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role || !selectedFront) {
      alert('Preencha os campos obrigatórios (Nome, Cargo e Frente).');
      return;
    }

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

    setIsLoading(true);
    try {
      await apiRequest(`/employees`, {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          cycleId,
          name,
          role,
          level,
          email,
          status,
          observations,
          grossSalary: grossSalary ? parseFloat(grossSalary.replace(',', '.')) : null,
          frontId: selectedFront,
          subdivisionId: selectedSubdivision || null,
          allocatedHours: parseFloat(allocatedHours),
          predictableRecurrentTimePercentage: prevPercent,
          unpredictableRecurrentTimePercentage: unprevPercent,
          allocationStartDate: allocationStartDate ? allocationStartDate : null,
          allocationEndDate: allocationEndDate ? allocationEndDate : null
        })
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao criar e alocar colaborador.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-4xl bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/20 pointer-events-auto"
        >
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Novo Colaborador</h2>
              <p className="text-sm text-slate-500 mt-1">Crie um novo colaborador e vincule-o a este ciclo.</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            {isFetching ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* DADOS PESSOAIS */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">Dados Pessoais</h3>
                    
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo *</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Ex: João da Silva"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Cargo / Papel *</label>
                        <input
                          type="text"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          required
                          placeholder="Ex: Analista Fiscal"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nível</label>
                        <select
                          value={level}
                          onChange={(e) => setLevel(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        >
                          <option value="">Selecione</option>
                          <option value="Estagiário">Estagiário</option>
                          <option value="Júnior">Júnior</option>
                          <option value="Pleno">Pleno</option>
                          <option value="Sênior">Sênior</option>
                          <option value="Especialista">Especialista</option>
                          <option value="Gerente">Gerente</option>
                          <option value="Diretor">Diretor</option>
                          <option value="Sócio">Sócio</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Salário Bruto (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={grossSalary}
                          onChange={(e) => setGrossSalary(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Status Global</label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        >
                          <option value="ACTIVE">Ativo</option>
                          <option value="INACTIVE">Inativo</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">E-mail Profissional</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@escritorio.com.br"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Observações do Colaborador</label>
                      <textarea
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Observações adicionais..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700 h-24 resize-none"
                      />
                    </div>
                  </div>

                  {/* ALOCAÇÃO */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">Alocação no Ciclo</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Frente *</label>
                        <select
                          value={selectedFront}
                          onChange={(e) => setSelectedFront(e.target.value)}
                          required
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        >
                          <option value="">Selecione uma frente</option>
                          {fronts.map(front => (
                            <option key={front.id} value={front.id}>{front.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Célula (Opcional)</label>
                        <select
                          value={selectedSubdivision}
                          onChange={(e) => setSelectedSubdivision(e.target.value)}
                          disabled={!selectedFront || subdivisions.length === 0}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700 disabled:opacity-50"
                        >
                          <option value="">Selecione (opcional)</option>
                          {subdivisions.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Horas Alocadas/Dia *</label>
                        <input
                          type="number"
                          value={allocatedHours}
                          onChange={(e) => setAllocatedHours(e.target.value)}
                          min="1"
                          max="24"
                          required
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        />
                      </div>
                      <div>
                        {/* placeholder for visual balance */}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1" title="Atividades Recorrentes Previsíveis">Temp. Recorr. Prev. (%)</label>
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
                        <label className="block text-sm font-bold text-slate-700 mb-1" title="Atividades Recorrentes Não Previsíveis">Temp. Recorr. Não Prev. (%)</label>
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
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Data Início Alocação</label>
                        <input
                          type="date"
                          value={allocationStartDate}
                          onChange={(e) => setAllocationStartDate(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Data Fim Alocação</label>
                        <input
                          type="date"
                          value={allocationEndDate}
                          onChange={(e) => setAllocationEndDate(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto flex-1 py-4 px-4 bg-slate-50 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto flex-1 py-4 px-4 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-teal-600/30"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar e Alocar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
