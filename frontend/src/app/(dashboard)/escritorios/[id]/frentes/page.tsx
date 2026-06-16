"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Network, Check, Plus, Trash2 } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';

const defaultFronts = [
  'Contábil',
  'Fiscal',
  'DP/Pessoal',
  'Legalização',
  'BPO Financeiro'
];

export default function AtivacaoFrentesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Array de objetos { name, isActive, dbId? }
  const [fronts, setFronts] = useState<{name: string, isActive: boolean, dbId?: string}[]>([]);
  const [newFrontName, setNewFrontName] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const profile = await apiRequest('/users/me');
        if (profile.role === 'ADMIN') {
          setIsAdmin(true);
        }

        const data = await apiRequest(`/structures/fronts?tenantId=${id}`);
        
        // Match default fronts with DB fronts
        const loadedFronts = defaultFronts.map(df => {
          const found = data?.find((f: any) => f.name.toLowerCase() === df.toLowerCase());
          return {
            name: df,
            isActive: !!found,
            dbId: found?.id
          };
        });

        // Add custom fronts from DB that are not in default list
        if (data) {
          data.forEach((f: any) => {
            if (!defaultFronts.find(df => df.toLowerCase() === f.name.toLowerCase())) {
              loadedFronts.push({
                name: f.name,
                isActive: true,
                dbId: f.id
              });
            }
          });
        }

        setFronts(loadedFronts);
      } catch (err) {
        console.error('Erro ao buscar frentes:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const toggleFront = async (index: number) => {
    if (!isAdmin) return;
    
    const newFronts = [...fronts];
    const target = newFronts[index];
    
    target.isActive = !target.isActive;
    setFronts(newFronts);
  };

  const handleAddCustomFront = () => {
    if (!newFrontName.trim()) return;
    setFronts([...fronts, { name: newFrontName.trim(), isActive: true }]);
    setNewFrontName('');
  };

  const handleSaveAndNext = async () => {
    try {
      setIsSaving(true);
      
      // Save all active fronts to DB. Delete inactive ones if they had a dbId.
      for (const front of fronts) {
        if (front.isActive && !front.dbId) {
          // Create
          await apiRequest(`/structures/fronts`, {
            method: 'POST',
            body: JSON.stringify({ tenantId: id, name: front.name })
          });
        } else if (!front.isActive && front.dbId) {
          // Delete
          await apiRequest(`/structures/fronts/${front.dbId}?tenantId=${id}`, {
            method: 'DELETE'
          });
        }
      }
      
      router.push(`/escritorios/${id}/estruturas`);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar as frentes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative">
      {loading ? (
        <div className="flex justify-center items-center py-32"><Loader2 className="w-10 h-10 animate-spin text-teal-600" /></div>
      ) : (
      <>
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden"
        >
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-gradient-to-br from-amber-100 to-orange-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

          <div className="flex items-center gap-5 relative z-10">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-500/30 shrink-0 transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <Network className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Frentes de Atuação</h2>
              <p className="text-slate-500 font-medium mt-2 leading-relaxed max-w-xl">
                Configure as frentes ativas neste escritório. Elas guiarão a criação de células e a alocação de clientes.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8 p-8 relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            Selecione as Frentes
            <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">
              {fronts.filter(f => f.isActive).length} ativas
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {fronts.map((front, idx) => (
              <motion.div
                key={front.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: isAdmin ? 1.02 : 1, y: isAdmin ? -2 : 0 }}
                whileTap={{ scale: isAdmin ? 0.98 : 1 }}
                onClick={() => toggleFront(idx)}
                className={`group relative p-6 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center overflow-hidden ${
                  front.isActive 
                    ? 'border-amber-500 bg-amber-50/50 shadow-md shadow-amber-500/10' 
                    : 'border-slate-200 bg-white hover:border-amber-300 hover:shadow-sm'
                } ${!isAdmin && 'cursor-default pointer-events-none'}`}
              >
                {/* Subtle gradient background for active cards */}
                {front.isActive && (
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-100/50 to-transparent pointer-events-none" />
                )}

                <span className={`font-bold text-lg relative z-10 transition-colors ${
                  front.isActive ? 'text-amber-900' : 'text-slate-500 group-hover:text-slate-700'
                }`}>
                  {front.name}
                </span>
                
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  front.isActive 
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/30' 
                    : 'bg-slate-100 text-slate-300 group-hover:bg-amber-100 group-hover:text-amber-400'
                }`}>
                  <Check className={`w-4 h-4 transition-transform duration-300 ${front.isActive ? 'scale-100' : 'scale-75'}`} />
                </div>
              </motion.div>
            ))}
          </div>

          {isAdmin && (
            <div className="mt-10 pt-8 border-t border-slate-100">
              <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-slate-400" /> Adicionar Nova Frente
              </h4>
              <div className="flex flex-col sm:flex-row items-center gap-3 max-w-lg relative group">
                <input 
                  type="text" 
                  value={newFrontName}
                  onChange={e => setNewFrontName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCustomFront()}
                  placeholder="Ex: Comercial, Auditoria..."
                  className="flex-1 w-full pl-5 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 focus:bg-white transition-all shadow-sm"
                />
                <button 
                  onClick={handleAddCustomFront}
                  disabled={!newFrontName.trim()}
                  className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-amber-500 focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all shadow-md disabled:opacity-50 disabled:hover:bg-slate-900 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-end"
        >
          {isAdmin ? (
            <button 
              onClick={handleSaveAndNext}
              disabled={isSaving}
              className="group relative bg-gradient-to-r from-teal-600 to-teal-500 text-white px-8 py-4 rounded-2xl transition-all font-bold text-sm flex items-center gap-3 shadow-xl shadow-teal-600/20 hover:shadow-teal-600/40 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-teal-600/20 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10 flex items-center gap-2">
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Salvando Configurações...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Salvar e Avançar para Estruturas
                  </>
                )}
              </span>
            </button>
          ) : (
            <button 
              onClick={() => router.push(`/escritorios/${id}/estruturas`)}
              className="group relative bg-gradient-to-r from-teal-600 to-teal-500 text-white px-8 py-4 rounded-2xl transition-all font-bold text-sm flex items-center gap-3 shadow-xl shadow-teal-600/20 hover:shadow-teal-600/40 hover:-translate-y-0.5 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10">Avançar para Estruturas</span>
            </button>
          )}
        </motion.div>
      </>
      )}
    </div>
  );
}
