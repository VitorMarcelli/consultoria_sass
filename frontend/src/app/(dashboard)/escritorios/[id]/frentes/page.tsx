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
          className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/30 shrink-0">
              <Network className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Ativação de Frentes</h2>
              <p className="text-slate-500 font-medium mt-1">Selecione quais grandes áreas estão ativas neste escritório.</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8 p-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fronts.map((front, idx) => (
              <motion.div
                key={front.name}
                whileHover={{ scale: isAdmin ? 1.02 : 1 }}
                whileTap={{ scale: isAdmin ? 0.98 : 1 }}
                onClick={() => toggleFront(idx)}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center ${
                  front.isActive 
                    ? 'border-amber-500 bg-amber-50 shadow-md shadow-amber-500/10' 
                    : 'border-slate-100 bg-slate-50 opacity-60 hover:opacity-100'
                }`}
              >
                <span className={`font-bold ${front.isActive ? 'text-amber-800' : 'text-slate-500'}`}>
                  {front.name}
                </span>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  front.isActive ? 'bg-amber-500 text-white' : 'bg-slate-200 text-transparent'
                }`}>
                  <Check className="w-4 h-4" />
                </div>
              </motion.div>
            ))}
          </div>

          {isAdmin && (
            <div className="mt-8 pt-8 border-t border-slate-100 flex items-center gap-3 max-w-md">
              <input 
                type="text" 
                value={newFrontName}
                onChange={e => setNewFrontName(e.target.value)}
                placeholder="Ex: Comercial, Auditoria..."
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
              <button 
                onClick={handleAddCustomFront}
                className="bg-slate-900 text-white p-3 rounded-xl hover:bg-slate-800 transition-all shadow-md"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}
        </motion.div>

        <div className="pt-2 flex justify-end">
          {isAdmin ? (
            <button 
              onClick={handleSaveAndNext}
              disabled={isSaving}
              className="bg-teal-600 text-white px-10 py-4 rounded-2xl hover:bg-teal-700 transition-all font-bold text-sm flex items-center gap-2 shadow-xl shadow-teal-600/20 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {isSaving ? 'Salvando...' : 'Salvar e Avançar para Estruturas'}
            </button>
          ) : (
            <button 
              onClick={() => router.push(`/escritorios/${id}/estruturas`)}
              className="bg-teal-600 text-white px-10 py-4 rounded-2xl hover:bg-teal-700 transition-all font-bold text-sm flex items-center gap-2 shadow-xl shadow-teal-600/20"
            >
              Avançar para Estruturas
            </button>
          )}
        </div>
      </>
      )}
    </div>
  );
}
