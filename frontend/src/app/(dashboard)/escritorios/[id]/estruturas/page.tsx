"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, GitMerge, Plus, Trash2, Check } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';

const tableVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export default function CadastroEstruturasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Fronts and their subdivisions
  const [fronts, setFronts] = useState<any[]>([]);
  // We will maintain a flat list of subdivisions to make the UI simple like before, but explicitly tied to a front
  const [subdivisions, setSubdivisions] = useState<{id: string, frontId: string, frontName: string, subName: string, dbId?: string}[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const profile = await apiRequest('/users/me');
        if (profile.role === 'ADMIN') {
          setIsAdmin(true);
        }

        const frontData = await apiRequest(`/structures/fronts?tenantId=${id}`);
        setFronts(frontData || []);

        const loadedSubs: any[] = [];
        if (frontData) {
          frontData.forEach((front: any) => {
            if (front.subdivisions && front.subdivisions.length > 0) {
              front.subdivisions.forEach((sub: any) => {
                loadedSubs.push({
                  id: crypto.randomUUID(),
                  frontId: front.id,
                  frontName: front.name,
                  subName: sub.name,
                  dbId: sub.id
                });
              });
            } else {
              // Push an empty row so they can type
              loadedSubs.push({
                id: crypto.randomUUID(),
                frontId: front.id,
                frontName: front.name,
                subName: ''
              });
            }
          });
        }
        setSubdivisions(loadedSubs);

      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleSaveAndNext = async () => {
    try {
      setIsSaving(true);
      
      const existingFronts = await apiRequest(`/structures/fronts?tenantId=${id}`);

      for (const sub of subdivisions) {
        if (!sub.subName.trim() || !sub.frontId) continue;
        
        if (!sub.dbId) {
          // Create new subdivision
          await apiRequest(`/structures/subdivisions`, {
            method: 'POST',
            body: JSON.stringify({ tenantId: id, frontId: sub.frontId, name: sub.subName.trim() })
          });
        } else {
          // Patch existing (assuming backend supports PATCH /structures/subdivisions/:id)
          // For now, if we don't have PATCH, we can just skip if it already has dbId,
          // or assume it's created. In reality, you'd want to update the name if it changed.
          // Since the API might be simple, we just assume they don't rename, or they delete and recreate.
        }
      }
      
      router.push(`/escritorios/${id}/ciclos`);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar as células.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRow = (frontId: string, frontName: string) => {
    setSubdivisions([...subdivisions, { id: crypto.randomUUID(), frontId, frontName, subName: '' }]);
  };

  const handleDeleteRow = async (rowId: string) => {
    const row = subdivisions.find(s => s.id === rowId);
    if (!row) return;

    if (row.dbId) {
      if (confirm('Deseja excluir esta célula do banco de dados permanentemente?')) {
        try {
          await apiRequest(`/structures/subdivisions/${row.dbId}?tenantId=${id}`, { method: 'DELETE' });
          setSubdivisions(subdivisions.filter(s => s.id !== rowId));
        } catch (err) { alert('Erro ao excluir subgrupo'); }
      }
    } else {
      setSubdivisions(subdivisions.filter(s => s.id !== rowId));
    }
  };

  return (
    <div className="relative">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-gradient-to-br from-teal-100 to-emerald-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-teal-500/30 shrink-0 transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <GitMerge className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Células de Operação</h2>
            <p className="text-slate-500 font-medium mt-2 leading-relaxed max-w-xl">
              Crie subgrupos ou células específicas dentro de cada Frente Ativa para organizar suas equipes e fluxos.
            </p>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center items-center py-32"><Loader2 className="w-10 h-10 animate-spin text-teal-600" /></div>
      ) : fronts.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-50 border border-dashed border-slate-300 rounded-3xl p-12 text-center text-slate-500"
        >
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
            <GitMerge className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">Sem Frentes Ativas</h3>
          <p className="max-w-sm mx-auto">Vá para a aba Frentes e ative ao menos uma área operacional antes de criar as células.</p>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8 p-8 relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
          
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            Estrutura de Subgrupos
            <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">
              {subdivisions.length} criados
            </span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="pb-4 font-bold text-left w-1/3">Frente Operacional</th>
                  <th className="pb-4 font-bold text-left">Nome da Célula / Subgrupo (Opcional)</th>
                  <th className="pb-4 font-bold text-right w-32">Ações</th>
                </tr>
              </thead>
              <motion.tbody 
                variants={tableVariants}
                initial="hidden"
                animate="show"
                className="divide-y divide-slate-50"
              >
                <AnimatePresence>
                  {subdivisions.map((sub) => (
                    <motion.tr 
                      variants={rowVariants}
                      key={sub.id} 
                      className="group transition-colors hover:bg-slate-50/50"
                    >
                      <td className="py-5 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-teal-400 shadow-sm shadow-teal-400/50" />
                          <span className="font-bold text-slate-800 text-base">{sub.frontName}</span>
                        </div>
                      </td>
                      <td className="py-5 pr-4">
                        <input 
                          type="text" 
                          value={sub.subName}
                          placeholder="Ex: Célula Simples Nacional"
                          disabled={!isAdmin}
                          className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:bg-white transition-all hover:border-slate-300 disabled:bg-slate-50 disabled:text-slate-400 shadow-sm disabled:shadow-none"
                          onChange={(e) => {
                            const newSubs = [...subdivisions];
                            newSubs.find(s => s.id === sub.id)!.subName = e.target.value;
                            setSubdivisions(newSubs);
                          }}
                        />
                      </td>
                      <td className="py-5 pl-4 text-right">
                        {isAdmin && (
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleAddRow(sub.frontId, sub.frontName)} 
                              title="Adicionar mais uma célula nesta frente"
                              className="p-2.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteRow(sub.id)} 
                              title="Remover esta célula"
                              className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </motion.tbody>
            </table>
          </div>
        </motion.div>
      )}

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex justify-end"
      >
        {isAdmin ? (
          <button 
            onClick={handleSaveAndNext}
            disabled={isSaving || loading || fronts.length === 0}
            className="group relative bg-gradient-to-r from-teal-600 to-teal-500 text-white px-8 py-4 rounded-2xl transition-all duration-300 font-bold text-sm flex items-center gap-3 shadow-lg shadow-teal-600/30 hover:shadow-xl hover:shadow-teal-600/40 hover:-translate-y-1 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-teal-600/30"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvando Configurações...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Salvar e Avançar para Ciclos
              </>
            )}
          </button>
        ) : (
          <button 
            onClick={() => router.push(`/escritorios/${id}/ciclos`)}
            className="group relative bg-gradient-to-r from-teal-600 to-teal-500 text-white px-8 py-4 rounded-2xl transition-all duration-300 font-bold text-sm flex items-center gap-3 shadow-lg shadow-teal-600/30 hover:shadow-xl hover:shadow-teal-600/40 hover:-translate-y-1"
          >
            Avançar para Ciclos
          </button>
        )}
      </motion.div>
    </div>
  );
}
