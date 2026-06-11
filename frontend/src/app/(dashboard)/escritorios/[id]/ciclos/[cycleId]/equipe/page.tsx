'use client';

import React, { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Loader2, Users, Plus, Trash2, Edit2 } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';

const tableVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export default function CycleTeamPage({
  params,
}: {
  params: Promise<{ id: string; cycleId: string }>;
}) {
  const { id, cycleId } = use(params);
  const searchParams = useSearchParams();
  const frontId = searchParams.get('frontId') || '';
  const subdivisionId = searchParams.get('subdivisionId') || '';

  const [team, setTeam] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadTeam = async () => {
    setIsLoading(true);
    try {
      let url = `/management-cycles/${cycleId}/team?tenantId=${id}`;
      if (frontId) url += `&frontId=${frontId}`;
      if (subdivisionId) url += `&subdivisionId=${subdivisionId}`;

      const data = await apiRequest(url);
      setTeam(data || []);
    } catch (err) {
      console.error('Erro ao buscar equipe do ciclo:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, [id, cycleId, frontId, subdivisionId]);

  const filteredTeam = team.filter(member => 
    member.employee?.name?.toLowerCase().includes(search.toLowerCase()) || 
    member.employee?.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
      >
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Equipe Alocada</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Gerencie a equipe designada para esta célula neste ciclo.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl hover:bg-teal-600 transition-all font-bold text-sm shadow-xl hover:shadow-teal-600/30"
            onClick={() => alert('Em desenvolvimento: Modal de Alocação de Equipe')}
          >
            <Plus className="w-4 h-4" />
            Alocar Colaborador
          </button>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8"
      >
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full max-w-md">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar colaborador por nome ou cargo..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300 shadow-sm"
            />
          </div>
          <div className="text-sm font-bold text-slate-400 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            Total na equipe: <span className="text-slate-900">{filteredTeam.length}</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-slate-400 uppercase tracking-widest bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-8 py-5 font-bold">Colaborador</th>
                <th className="px-8 py-5 font-bold">Cargo</th>
                <th className="px-8 py-5 font-bold">Horas Alocadas</th>
                <th className="px-8 py-5 text-right font-bold w-32">Ações</th>
              </tr>
            </thead>
            {isLoading ? (
              <tbody>
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-500" />
                    <p className="font-bold text-sm">Carregando equipe alocada...</p>
                  </td>
                </tr>
              </tbody>
            ) : filteredTeam.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-slate-500">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
                      <Users className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="font-bold text-slate-700 text-lg mb-1">Nenhum colaborador alocado</p>
                    <p className="text-sm font-medium text-slate-400 max-w-sm mx-auto">Selecione uma Frente e Célula específicas ou clique em "Alocar Colaborador".</p>
                  </td>
                </tr>
              </tbody>
            ) : (
              <motion.tbody 
                variants={tableVariants}
                initial="hidden"
                animate="show"
                className="divide-y divide-slate-100"
              >
                <AnimatePresence>
                  {filteredTeam.map((member) => (
                    <motion.tr 
                      variants={rowVariants}
                      key={member.id} 
                      className="bg-white hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                            <Users className="w-5 h-5" />
                          </div>
                          <span className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors">{member.employee?.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-slate-600 font-semibold">{member.employee?.role || '-'}</td>
                      <td className="px-8 py-5 text-slate-600 font-semibold">{member.allocatedHours}h</td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button 
                            className="p-2 text-slate-400 hover:text-teal-600 transition-colors rounded-xl hover:bg-teal-50"
                            title="Editar alocação"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-xl hover:bg-rose-50"
                            title="Remover da célula"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </motion.tbody>
            )}
          </table>
        </div>
      </motion.div>
    </div>
  );
}
