'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Plus, Play, CheckCircle, Loader2, ArrowRight, Trash2, FolderClock, Users } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export default function GestaoCiclosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Modal de Novo Ciclo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
  const [newYear, setNewYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchCycles();
  }, [id]);

  const fetchCycles = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/management-cycles?tenantId=${id}`);
      setCycles(data || []);
    } catch (err) {
      console.error('Erro ao carregar ciclos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const result = await apiRequest('/management-cycles', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: id,
          month: Number(newMonth),
          year: Number(newYear)
        })
      });
      setCycles([result, ...cycles]);
      setIsModalOpen(false);
      alert('Novo ciclo criado e carteira clonada com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao criar ciclo');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCycle = async (cycleId: string) => {
    if (!confirm('Atenção: Excluir este ciclo apagará também todo o snapshot da carteira de clientes associada a ele. Esta ação é irreversível. Deseja continuar?')) return;
    
    try {
      await apiRequest(`/management-cycles/${cycleId}?tenantId=${id}`, { method: 'DELETE' });
      setCycles(cycles.filter(c => c.id !== cycleId));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir o ciclo.');
    }
  };

  const formatMonth = (m: number, y: number) => {
    const date = new Date(y, m - 1, 1);
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
  };

  return (
    <div className="relative">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-500/30 shrink-0">
            <FolderClock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Ciclos</h2>
            <p className="text-slate-500 font-medium mt-1">Controle de períodos, encerramentos e cópias de carteira.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl hover:bg-teal-600 transition-all font-bold text-sm shadow-xl hover:shadow-teal-600/30"
        >
          <Plus className="w-4 h-4" />
          Abrir Novo Ciclo
        </button>
      </motion.div>

      {loading ? (
        <div className="flex justify-center items-center py-32"><Loader2 className="w-10 h-10 animate-spin text-teal-600" /></div>
      ) : (
        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="show" 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8"
        >
          {cycles.length === 0 ? (
            <motion.div variants={itemVariants} className="col-span-full bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-12 flex flex-col items-center text-center text-slate-500">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                <Calendar className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">Nenhum ciclo iniciado</h3>
              <p className="max-w-md mx-auto">Clique no botão "Abrir Novo Ciclo" acima para criar o seu primeiro ciclo mensal e importar a base de clientes do escritório.</p>
            </motion.div>
          ) : (
            cycles.map(cycle => (
              <motion.div 
                variants={itemVariants}
                key={cycle.id} 
                className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col relative group hover:border-teal-300 hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                {/* Decorative background blob */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                <div className="flex items-start justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100 group-hover:bg-teal-50 group-hover:text-teal-600 group-hover:border-teal-200 transition-colors">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 capitalize leading-tight">{formatMonth(cycle.month, cycle.year)}</h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">ID: {cycle.id.slice(0,8)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteCycle(cycle.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Excluir Ciclo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mb-8 relative z-10">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    cycle.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/20' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-500/20'
                  }`}>
                    {cycle.status === 'OPEN' ? <Play className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                    {cycle.status === 'OPEN' ? 'Em Andamento' : 'Concluído'}
                  </span>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center relative z-10">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Snapshot Salvo
                  </span>
                  <button 
                    onClick={() => router.push(`/escritorios/${id}/ciclos/${cycle.id}`)}
                    className="flex items-center justify-center w-10 h-10 shrink-0 rounded-full bg-slate-50 text-slate-500 hover:bg-teal-600 hover:text-white transition-colors group-hover:shadow-md"
                    title="Acessar Ciclo"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      )}

      {/* Modal Modernizado */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl relative border border-slate-100 overflow-hidden"
          >
            {/* Background decors */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50/50 rounded-bl-full -z-0 pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-teal-50 to-emerald-100 rounded-2xl flex items-center justify-center text-teal-600 border border-teal-200/50 shadow-sm shrink-0">
                    <Calendar className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Novo Ciclo Mensal</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">Configuração do novo período de gestão.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  title="Fechar modal"
                >
                  <span className="sr-only">Fechar</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mb-8 flex gap-4 items-start shadow-sm">
                <div className="bg-white p-2 rounded-xl shadow-sm text-emerald-600 shrink-0">
                  <FolderClock className="w-5 h-5" />
                </div>
                <p className="text-sm text-emerald-800 font-medium leading-relaxed mt-0.5">
                  Ao confirmar, o sistema irá <strong className="font-bold text-emerald-900">clonar automaticamente</strong> a carteira de clientes, alocações e responsáveis do ciclo anterior para este novo mês, mantendo toda a amarração.
                </p>
              </div>
              
              <form onSubmit={handleCreateCycle} className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider pl-1">Mês de Referência</label>
                    <div className="relative">
                      <select 
                        required 
                        value={newMonth} 
                        onChange={e => setNewMonth(Number(e.target.value))} 
                        className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all appearance-none cursor-pointer shadow-sm hover:border-slate-300"
                      >
                        {[
                          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                        ].map((m, i) => (
                          <option key={i+1} value={i+1}>{m}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider pl-1">Ano Base</label>
                    <div className="relative">
                      <select 
                        required 
                        value={newYear} 
                        onChange={e => setNewYear(Number(e.target.value))} 
                        className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all appearance-none cursor-pointer shadow-sm hover:border-slate-300"
                      >
                        {Array.from({length: 10}, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isCreating} className="px-8 py-3.5 text-sm font-bold text-white bg-slate-900 hover:bg-teal-600 hover:shadow-lg hover:shadow-teal-600/30 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:pointer-events-none">
                    {isCreating ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Criando...</>
                    ) : (
                      <><Play className="w-4 h-4" /> Iniciar Novo Ciclo</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
