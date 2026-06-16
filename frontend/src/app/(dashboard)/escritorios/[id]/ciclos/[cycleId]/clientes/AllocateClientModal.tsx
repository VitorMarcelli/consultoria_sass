import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';

import { Portal } from '@/components/ui/Portal';

interface AllocateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  cycleId: string;
  onSuccess: () => void;
}

export default function AllocateClientModal({ isOpen, onClose, tenantId, cycleId, onSuccess }: AllocateClientModalProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [fronts, setFronts] = useState<any[]>([]);
  const [subdivisions, setSubdivisions] = useState<any[]>([]);
  
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedFront, setSelectedFront] = useState('');
  const [selectedSubdivision, setSelectedSubdivision] = useState('');
  
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
      const [clientsData, frontsData] = await Promise.all([
        apiRequest(`/clients?tenantId=${tenantId}`),
        apiRequest(`/structures/fronts?tenantId=${tenantId}`)
      ]);
      setClients(clientsData || []);
      setFronts(frontsData || []);
    } catch (err) {
      console.error('Error fetching data for client allocation:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const resetForm = () => {
    setSelectedClient('');
    setSelectedFront('');
    setSelectedSubdivision('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !selectedFront) {
      alert('Selecione um cliente e uma frente.');
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest(`/management-cycles/${cycleId}/clients`, {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          clientId: selectedClient,
          frontId: selectedFront,
          subdivisionId: selectedSubdivision || null
        })
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao alocar cliente ao ciclo.');
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
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/20 pointer-events-auto"
        >
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Alocar Cliente</h2>
              <p className="text-sm text-slate-500 mt-1">Vincule um cliente existente da base a este ciclo.</p>
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
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Cliente *</label>
                  <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                  >
                    <option value="">Selecione um cliente da base</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

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

                {selectedFront && subdivisions.length > 0 && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Célula (Opcional)</label>
                    <select
                      value={selectedSubdivision}
                      onChange={(e) => setSelectedSubdivision(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                    >
                      <option value="">Selecione uma célula (opcional)</option>
                      {subdivisions.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                )}

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
        )}
      </AnimatePresence>
    </Portal>
  );
}
