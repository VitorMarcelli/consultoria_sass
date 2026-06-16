import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { Portal } from '@/components/ui/Portal';
import { motion, AnimatePresence } from 'framer-motion';

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  clients: any[];
  fronts: any[];
  employees: any[];
  onSuccess: () => void;
}

export function DeliveryModal({ isOpen, onClose, tenantId, clients, fronts, employees, onSuccess }: DeliveryModalProps) {
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    clientId: '',
    frontId: '',
    standardizedName: '',
    responsibleId: '',
    competence: 0 // Optional min. Ex: 45 min
  });

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setFormData({
        clientId: '',
        frontId: '',
        standardizedName: '',
        responsibleId: '',
        competence: 0
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.frontId || !formData.standardizedName || !formData.responsibleId) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setSaving(true);
    try {
      await apiRequest('/deliveries', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          clientId: formData.clientId,
          frontId: formData.frontId,
          responsibleId: formData.responsibleId,
          standardizedName: formData.standardizedName,
          originalName: formData.standardizedName, // keeping both identical for now
          competence: formData.competence || 0,
        })
      });
      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar entrega:', error);
      alert('Erro ao salvar a entrega.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-white">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Nova Entrega</h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">Mapeamento de obrigações operacionais</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto">
                <form id="delivery-form" onSubmit={handleSubmit} className="space-y-5">
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Cliente *</label>
                    <select 
                      value={formData.clientId}
                      onChange={e => setFormData({...formData, clientId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300"
                      required
                    >
                      <option value="">Selecione um cliente...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.tradeName || c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Frente de Serviço *</label>
                    <select 
                      value={formData.frontId}
                      onChange={e => setFormData({...formData, frontId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300"
                      required
                    >
                      <option value="">Selecione a frente...</option>
                      {fronts.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Nome da Entrega *</label>
                    <input 
                      type="text"
                      placeholder="Ex: Apuração Simples Nacional"
                      value={formData.standardizedName}
                      onChange={e => setFormData({...formData, standardizedName: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300 placeholder:text-slate-400 placeholder:font-normal"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Responsável *</label>
                    <select 
                      value={formData.responsibleId}
                      onChange={e => setFormData({...formData, responsibleId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300"
                      required
                    >
                      <option value="">Selecione o funcionário...</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Tempo Previsto <span className="font-normal text-slate-400">(minutos)</span></label>
                    <input 
                      type="number"
                      placeholder="Ex: 45"
                      min="0"
                      value={formData.competence || ''}
                      onChange={e => setFormData({...formData, competence: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300 placeholder:text-slate-400 placeholder:font-normal"
                    />
                    <p className="text-[11px] font-medium text-slate-400 mt-2">* Opcional. Deixe em branco se não aplicável no momento.</p>
                  </div>

                </form>
              </div>

              <div className="px-8 py-5 border-t border-slate-100 flex justify-end gap-3 bg-white">
                <button 
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-all font-bold text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  form="delivery-form"
                  disabled={saving}
                  className="bg-teal-600 text-white px-6 py-2.5 rounded-xl hover:bg-teal-700 transition-all font-bold text-sm flex items-center gap-2 disabled:opacity-50 shadow-md shadow-teal-600/20"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Entrega'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
