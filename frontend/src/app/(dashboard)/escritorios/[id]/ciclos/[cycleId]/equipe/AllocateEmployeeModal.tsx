import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Info } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';

import { Portal } from '@/components/ui/Portal';

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
  const [allocations, setAllocations] = useState<any[]>([]);
  
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
      const [empsData, frontsData, allocsData] = await Promise.all([
        apiRequest(`/employees?tenantId=${tenantId}`),
        apiRequest(`/structures/fronts?tenantId=${tenantId}`),
        apiRequest(`/allocations?tenantId=${tenantId}`)
      ]);
      setEmployees(empsData || []);
      setFronts(frontsData || []);
      setAllocations(allocsData || []);
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
      alert(err.message || 'Erro ao alocar colaborador.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar status de alocação em tempo real
  const getAllocationStatus = () => {
    if (!selectedEmployee) return { error: null, info: null, fullyAllocated: false };

    const empAllocs = allocations.filter(a => a.employeeId === selectedEmployee && a.cycleId === cycleId);
    
    // 1. Check if fully allocated
    let fullyAllocated = false;
    if (fronts.length > 0) {
      let hasUnallocated = false;
      for (const f of fronts) {
        if (f.subdivisions && f.subdivisions.length > 0) {
          for (const s of f.subdivisions) {
            if (!empAllocs.some(a => a.frontId === f.id && a.subdivisionId === s.id)) {
              hasUnallocated = true;
              break;
            }
          }
        } else {
          if (!empAllocs.some(a => a.frontId === f.id && !a.subdivisionId)) {
            hasUnallocated = true;
            break;
          }
        }
        if (hasUnallocated) break;
      }
      fullyAllocated = !hasUnallocated;
    }

    if (fullyAllocated) {
      return {
        error: "Este colaborador já está alocado em todas as frentes e células deste escritório.",
        info: null,
        fullyAllocated: true
      };
    }

    if (!selectedFront) return { error: null, info: null, fullyAllocated: false };

    const front = fronts.find(f => f.id === selectedFront);
    const empAllocsInFront = empAllocs.filter(a => a.frontId === selectedFront);

    if (selectedSubdivision) {
      const sub = front?.subdivisions?.find((s: any) => s.id === selectedSubdivision);
      const alreadyInSub = empAllocsInFront.some(a => a.subdivisionId === selectedSubdivision);
      if (alreadyInSub) {
        return {
          error: `Não foi possível Alocar, colaborador já faz parte da Célula ${sub?.name || ''} na Frente ${front?.name || ''}.`,
          info: null,
          fullyAllocated: false
        };
      } else if (empAllocsInFront.length > 0) {
        const existingSubs = empAllocsInFront.map(a => {
          const s = front?.subdivisions?.find((sub: any) => sub.id === a.subdivisionId);
          return s ? s.name : 'Geral';
        }).join(', ');
        return {
          error: null,
          info: `Nota: Este colaborador já faz parte da Frente ${front?.name || ''} (${existingSubs}). Confirmar criará uma nova alocação na Célula ${sub?.name || ''}.`,
          fullyAllocated: false
        };
      }
    } else {
      // No subdivision selected
      if (empAllocsInFront.length > 0) {
        if (!front?.subdivisions || front.subdivisions.length === 0 || empAllocsInFront.some(a => !a.subdivisionId)) {
          return {
            error: `Não foi possível Alocar, colaborador já faz parte da Frente ${front?.name || ''}.`,
            info: null,
            fullyAllocated: false
          };
        } else {
          const existingSubs = empAllocsInFront.map(a => {
            const s = front?.subdivisions?.find((sub: any) => sub.id === a.subdivisionId);
            return s ? s.name : 'Geral';
          }).join(', ');
          return {
            error: `Não foi possível Alocar, colaborador já faz parte da Frente ${front?.name || ''} (${existingSubs}). Por favor, selecione uma nova Célula abaixo para alocação.`,
            info: null,
            fullyAllocated: false
          };
        }
      }
    }

    return { error: null, info: null, fullyAllocated: false };
  };

  const { error: allocError, info: allocInfo, fullyAllocated } = getAllocationStatus();

  const getFrontLabel = (front: any) => {
    if (!selectedEmployee) return front.name;
    const allocs = allocations.filter(a => a.employeeId === selectedEmployee && a.cycleId === cycleId && a.frontId === front.id);
    if (allocs.length === 0) return front.name;
    const subNames = allocs.map(a => {
      if (a.subdivisionId) {
        const sub = front.subdivisions?.find((s: any) => s.id === a.subdivisionId);
        return sub ? sub.name : 'Célula';
      }
      return 'Geral';
    });
    return `${front.name} (Já Alocado: ${subNames.join(', ')})`;
  };

  const getSubdivisionLabel = (sub: any) => {
    if (!selectedEmployee) return sub.name;
    const isAllocated = allocations.some(a => a.employeeId === selectedEmployee && a.cycleId === cycleId && a.frontId === selectedFront && a.subdivisionId === sub.id);
    return isAllocated ? `${sub.name} (Já Alocado nesta Célula)` : sub.name;
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
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/20 pointer-events-auto"
        >
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Alocar Colaborador</h2>
              <p className="text-sm text-slate-500 mt-1">Vincule um colaborador a uma Frente/Célula.</p>
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
              <form onSubmit={handleSubmit} className="space-y-4">
                {allocError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-700 text-xs font-bold shadow-sm"
                  >
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">{allocError}</div>
                  </motion.div>
                )}

                {allocInfo && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-start gap-3 text-teal-700 text-xs font-bold shadow-sm"
                  >
                    <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">{allocInfo}</div>
                  </motion.div>
                )}

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
                        <option key={front.id} value={front.id}>{getFrontLabel(front)}</option>
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
                        <option key={sub.id} value={sub.id}>{getSubdivisionLabel(sub)}</option>
                      ))}
                    </select>
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

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto flex-1 py-3 px-4 bg-slate-50 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !!allocError || fullyAllocated}
                    className="w-full sm:w-auto flex-1 py-3 px-4 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Alocação'}
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
