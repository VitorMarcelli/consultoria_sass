import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';

interface AllocateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  cycleId: string;
  onSuccess: () => void;
}

export default function AllocateEmployeeModal({ isOpen, onClose, tenantId, cycleId, onSuccess }: AllocateEmployeeModalProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [fronts, setFronts] = useState<any[]>([]);
  const [subdivisions, setSubdivisions] = useState<any[]>([]);
  
  const [selectedEmployee, setSelectedEmployee] = useState('');
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
      loadData();
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

  const loadData = async () => {
    setIsFetching(true);
    try {
      const [empsData, frontsData] = await Promise.all([
        apiRequest(`/employees?tenantId=${tenantId}`),
        apiRequest(`/structures/fronts?tenantId=${tenantId}`)
      ]);
      setEmployees(empsData || []);
      setFronts(frontsData || []);
    } catch (err) {
      console.error('Error fetching data for allocation:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const resetForm = () => {
    setSelectedEmployee('');
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
    if (!selectedEmployee || !selectedFront) {
      alert('Selecione um colaborador e uma frente.');
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest('/allocations', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          cycleId,
          employeeId: selectedEmployee,
          frontId: selectedFront,
          subdivisionId: selectedSubdivision || null,
          dailyAvailableTime: Number(allocatedHours),
          status: 'ACTIVE',
          predictableRecurrentTimePercentage: predictableRecurrentTimePercentage ? parseFloat(predictableRecurrentTimePercentage.replace(',', '.')) : null,
          unpredictableRecurrentTimePercentage: unpredictableRecurrentTimePercentage ? parseFloat(unpredictableRecurrentTimePercentage.replace(',', '.')) : null,
          allocationStartDate: allocationStartDate ? allocationStartDate : null,
          allocationEndDate: allocationEndDate ? allocationEndDate : null
        })
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao alocar colaborador.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
        >
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Alocar Colaborador</h2>
              <p className="text-sm text-slate-500 mt-1">Vincule um colaborador a uma Frente/Célula.</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {isFetching ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Colaborador *</label>
                    <select
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                    >
                      <option value="">Selecione um colaborador</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} - {emp.role}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Horas Alocadas (Por Dia) *</label>
                    <input
                      type="number"
                      value={allocatedHours}
                      onChange={(e) => setAllocatedHours(e.target.value)}
                      required
                      min="1"
                      max="24"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                    />
                  </div>
                </div>

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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1" title="Atividades Recorrentes Previsíveis">Temp. Recorr. Prev. (%)</label>
                    <input
                      type="number"
                      value={predictableRecurrentTimePercentage}
                      onChange={(e) => setPredictableRecurrentTimePercentage(e.target.value)}
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
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="Ex: 20"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 px-4 bg-slate-50 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors flex justify-center items-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Alocação'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
