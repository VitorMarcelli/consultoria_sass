'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Loader2, Settings2, ChevronRight, Palette } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { Portal } from '@/components/ui/Portal';

interface SystemOptionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  title: string;
  description: string;
  onUpdated: () => void;
  hasColor?: boolean;
}

const COLORS = [
  { value: 'emerald', label: 'Verde', class: 'bg-emerald-500' },
  { value: 'amber', label: 'Amarelo', class: 'bg-amber-500' },
  { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
  { value: 'slate', label: 'Cinza', class: 'bg-slate-500' },
  { value: 'rose', label: 'Vermelho', class: 'bg-rose-500' },
  { value: 'teal', label: 'Roxo', class: 'bg-teal-500' },
];

export default function SystemOptionManagerModal({
  isOpen,
  onClose,
  category,
  title,
  description,
  onUpdated,
  hasColor = false,
}: SystemOptionManagerModalProps) {
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('blue');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchOptions();
    }
  }, [isOpen, category]);

  const fetchOptions = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/system-options');
      setOptions(data.filter((o: any) => o.category === category));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newLabel.trim()) return;
    try {
      setSaving(true);
      const value = newLabel.trim().toUpperCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      await apiRequest('/system-options', {
        method: 'POST',
        body: JSON.stringify({ category, label: newLabel.trim(), value, color: hasColor ? newColor : null })
      });
      setNewLabel('');
      if (hasColor) setNewColor('blue');
      await fetchOptions();
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/system-options/${id}`, { method: 'DELETE' });
      await fetchOptions();
      onUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-[110]"
            >
              <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-black text-slate-900">{title}</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">{description}</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                {/* Add New Section */}
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Adicionar Nova Opção</label>
                  
                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="Ex: Novo Valor..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreate();
                      }}
                    />

                    {hasColor && (
                      <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="text-xs font-bold text-slate-500 ml-1">Cor Associada</span>
                        <div className="flex items-center gap-2">
                          {COLORS.map(c => (
                            <button
                              key={c.value}
                              onClick={() => setNewColor(c.value)}
                              className={`w-8 h-8 rounded-full ${c.class} border-2 transition-all ${newColor === c.value ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent opacity-50 hover:opacity-100'}`}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={handleCreate}
                      disabled={saving || !newLabel.trim()}
                      className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 
                      Salvar Nova Opção
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-100 w-full my-6"></div>

                {/* List Section */}
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Opções Cadastradas</label>
                  
                  {loading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
                    </div>
                  ) : options.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <span className="text-sm font-medium text-slate-400">Nenhuma opção personalizada cadastrada.</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {options.map(opt => (
                        <div key={opt.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl group hover:border-slate-300 transition-colors">
                          <div className="flex items-center gap-3">
                            {hasColor && opt.color && (
                              <span className={`w-3 h-3 rounded-full bg-${opt.color}-500 shadow-sm`} />
                            )}
                            <span className="text-sm font-bold text-slate-700">{opt.label}</span>
                          </div>
                          <button 
                            onClick={() => handleDelete(opt.id)}
                            className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
