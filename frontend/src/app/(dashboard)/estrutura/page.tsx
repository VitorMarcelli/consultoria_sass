'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Network, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Loader2,
  AlertCircle,
  FolderTree,
  Building,
  User,
  FileText
} from 'lucide-react';
import { apiRequest } from '@/utils/api';

interface Employee {
  id: string;
  name: string;
  role: string;
}

interface Subdivision {
  id: string;
  name: string;
  status: string;
  leaderId?: string;
  leader?: Employee;
  observations?: string;
}

interface OperationalFront {
  id: string;
  name: string;
  status: string;
  observations?: string;
  subdivisions?: Subdivision[];
}

export default function EstruturaPage() {
  const [fronts, setFronts] = useState<OperationalFront[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isFrontModalOpen, setIsFrontModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('BASICO'); // BASICO, AVANCADO
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedFront, setSelectedFront] = useState<OperationalFront | null>(null);
  const [selectedSub, setSelectedSub] = useState<Subdivision | null>(null);
  
  const [frontFormData, setFrontFormData] = useState({ name: '', status: 'ACTIVE', observations: '' });
  const [subFormData, setSubFormData] = useState({ name: '', frontId: '', status: 'ACTIVE', leaderId: '', observations: '' });

  const [deleteConfirmType, setDeleteConfirmType] = useState<'FRONT' | 'SUB' | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const [frontsData, employeesData] = await Promise.all([
        apiRequest('/structures/fronts').catch(() => []),
        apiRequest('/employees').catch(() => [])
      ]);
      setFronts(frontsData);
      setEmployees(employeesData);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar estrutura.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenFrontModal = (front?: OperationalFront) => {
    if (front) {
      setSelectedFront(front);
      setFrontFormData({ name: front.name, status: front.status, observations: front.observations || '' });
    } else {
      setSelectedFront(null);
      setFrontFormData({ name: '', status: 'ACTIVE', observations: '' });
    }
    setActiveTab('BASICO');
    setIsFrontModalOpen(true);
  };

  const handleOpenSubModal = (frontId: string, sub?: Subdivision) => {
    if (sub) {
      setSelectedSub(sub);
      setSubFormData({ 
        name: sub.name, 
        frontId, 
        status: sub.status || 'ACTIVE',
        leaderId: sub.leaderId || '',
        observations: sub.observations || ''
      });
    } else {
      setSelectedSub(null);
      setSubFormData({ name: '', frontId, status: 'ACTIVE', leaderId: '', observations: '' });
    }
    setActiveTab('BASICO');
    setIsSubModalOpen(true);
  };

  const handleFrontSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontFormData.name) return;
    setSubmitting(true);
    try {
      if (selectedFront) {
        await apiRequest(`/structures/fronts/${selectedFront.id}`, {
          method: 'PATCH',
          body: JSON.stringify(frontFormData)
        });
      } else {
        await apiRequest('/structures/fronts', {
          method: 'POST',
          body: JSON.stringify(frontFormData)
        });
      }
      setIsFrontModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      console.error(err);
      alert('Erro ao salvar frente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subFormData.name) return;
    setSubmitting(true);
    try {
      const payload = { ...subFormData };
      if (!payload.leaderId) delete (payload as any).leaderId; // Avoid sending empty string if not selected

      if (selectedSub) {
        await apiRequest(`/structures/subdivisions/${selectedSub.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest('/structures/subdivisions', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      setIsSubModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      console.error(err);
      alert('Erro ao salvar subdivisão.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (type: 'FRONT' | 'SUB', id: string) => {
    try {
      setLoading(true);
      if (type === 'FRONT') {
        await apiRequest(`/structures/fronts/${id}`, { method: 'DELETE' });
      } else {
        await apiRequest(`/structures/subdivisions/${id}`, { method: 'DELETE' });
      }
      setDeleteConfirmId(null);
      setDeleteConfirmType(null);
      fetchData();
    } catch (err: unknown) {
      console.error(err);
      alert('Erro ao excluir registro.');
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'EX';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Network className="h-8 w-8 text-teal-500" />
            Estrutura Operacional
          </h1>
          <p className="text-slate-500 font-medium mt-1">Desenhe a estrutura da consultoria, suas frentes (ex: Fiscal) e subdivisões organizacionais.</p>
        </div>
        <button 
          onClick={() => handleOpenFrontModal()}
          className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-xl hover:bg-slate-800 transition-all active:scale-95 duration-200 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nova Frente Operacional
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-teal-50 border border-teal-200 p-4 text-teal-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="h-10 w-10 text-teal-500 animate-spin" />
        </div>
      ) : fronts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white border border-slate-200 rounded-[2rem] shadow-sm text-center px-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-teal-50 mb-6 shadow-inner border border-teal-100">
            <Network className="h-10 w-10 text-teal-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-900">Nenhuma Estrutura Definida</h3>
          <p className="text-slate-500 font-medium mt-2 max-w-md">Comece criando frentes maiores (como Contábil, DP) e adicione as células ou squads responsáveis dentro delas.</p>
          <button onClick={() => handleOpenFrontModal()} className="mt-8 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-colors">
            Criar Minha Primeira Frente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fronts.map((front) => (
            <div key={front.id} className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all flex flex-col group">
              
              {/* Card Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-teal-50 to-orange-50 border border-teal-100 flex items-center justify-center text-teal-600 font-black text-2xl shadow-sm">
                    {front.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{front.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${front.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {front.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {deleteConfirmType === 'FRONT' && deleteConfirmId === front.id ? (
                    <div className="flex items-center gap-1 bg-teal-50 rounded-xl p-1 animate-in zoom-in duration-200">
                      <button onClick={() => handleDelete('FRONT', front.id)} className="rounded-lg bg-teal-600 px-2 py-1 text-xs font-bold text-white hover:bg-teal-700">Sim</button>
                      <button onClick={() => { setDeleteConfirmId(null); setDeleteConfirmType(null); }} className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600">Não</button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => handleOpenFrontModal(front)} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"><Edit3 className="h-4 w-4" /></button>
                      <button onClick={() => { setDeleteConfirmType('FRONT'); setDeleteConfirmId(front.id); }} className="p-2 text-slate-400 hover:text-teal-600 bg-slate-50 hover:bg-teal-50 rounded-xl transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Observations snippet if any */}
              {front.observations && (
                <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 font-medium italic line-clamp-2">
                  "{front.observations}"
                </div>
              )}

              {/* Subdivisions List */}
              <div className="flex-1 flex flex-col">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FolderTree className="h-3.5 w-3.5" />
                  Células / Equipes ({front.subdivisions?.length || 0})
                </h4>
                
                {front.subdivisions && front.subdivisions.length > 0 ? (
                  <div className="space-y-3 mb-6 flex-1">
                    {front.subdivisions.map(sub => (
                      <div key={sub.id} className="bg-white border border-slate-200 hover:border-teal-200 rounded-2xl p-4 transition-colors group/sub shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-slate-800 text-sm">{sub.name}</h5>
                              {sub.status === 'INACTIVE' && <span className="h-2 w-2 rounded-full bg-slate-300"></span>}
                            </div>
                            
                            {sub.leader ? (
                              <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg w-max">
                                <User className="h-3 w-3 text-teal-500" />
                                Líder: {sub.leader.name}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-slate-400 uppercase">
                                Sem Líder Definido
                              </div>
                            )}
                          </div>

                          <div className="hidden group-hover/sub:flex gap-1 animate-in fade-in duration-200">
                            {deleteConfirmType === 'SUB' && deleteConfirmId === sub.id ? (
                              <div className="flex flex-col gap-1">
                                <button onClick={() => handleDelete('SUB', sub.id)} className="rounded-md bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-teal-700">Deletar</button>
                                <button onClick={() => { setDeleteConfirmId(null); setDeleteConfirmType(null); }} className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">Cancel</button>
                              </div>
                            ) : (
                              <>
                                <button onClick={() => handleOpenSubModal(front.id, sub)} className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-lg"><Edit3 className="h-3 w-3" /></button>
                                <button onClick={() => { setDeleteConfirmType('SUB'); setDeleteConfirmId(sub.id); }} className="p-1.5 text-slate-400 hover:text-teal-600 bg-slate-50 hover:bg-teal-50 rounded-lg"><Trash2 className="h-3 w-3" /></button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-6 border-2 border-dashed border-slate-100 rounded-2xl mb-6">
                    <p className="text-sm font-medium text-slate-400 text-center">Nenhuma subdivisão criada nesta frente.</p>
                  </div>
                )}
                
                <button onClick={() => handleOpenSubModal(front.id)} className="w-full py-3 rounded-xl border border-dashed border-slate-300 text-slate-500 text-sm font-bold hover:bg-slate-50 hover:border-teal-300 hover:text-teal-600 transition-all flex justify-center items-center gap-2 mt-auto">
                  <Plus className="h-4 w-4" />
                  Nova Célula
                </button>
              </div>

            </div>
          ))}
        </div>
      )}


      {/* FRONT MODAL (SLIDE-OVER) */}
      <AnimatePresence>
        {isFrontModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsFrontModalOpen(false)} />
            <motion.div 
              initial={{ x: '100%', opacity: 0.5 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-[70] w-full max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-black text-slate-900">{selectedFront ? 'Editar Frente Operacional' : 'Nova Frente Operacional'}</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">Departamentos maiores ou áreas de negócio.</p>
                </div>
                <button onClick={() => setIsFrontModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"><X className="h-5 w-5" /></button>
              </div>

              <div className="flex px-6 border-b border-slate-100 mt-2">
                <button onClick={() => setActiveTab('BASICO')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'BASICO' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                  <Building className="h-4 w-4" /> Básico
                </button>
                <button onClick={() => setActiveTab('AVANCADO')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'AVANCADO' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                  <FileText className="h-4 w-4" /> Notas
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form id="front-form" onSubmit={handleFrontSubmit} className="space-y-6">
                  {activeTab === 'BASICO' && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Nome da Frente <span className="text-teal-500">*</span></label>
                        <input required type="text" value={frontFormData.name} onChange={e => setFrontFormData({ ...frontFormData, name: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all bg-slate-50 focus:bg-white" placeholder="Ex: Contábil" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Status</label>
                        <select value={frontFormData.status} onChange={e => setFrontFormData({...frontFormData, status: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all bg-slate-50 focus:bg-white appearance-none">
                          <option value="ACTIVE">Ativo</option>
                          <option value="INACTIVE">Inativo</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {activeTab === 'AVANCADO' && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Anotações Internas da Frente</label>
                        <textarea value={frontFormData.observations} onChange={e => setFrontFormData({...frontFormData, observations: e.target.value})} rows={6} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all bg-slate-50 focus:bg-white resize-none" placeholder="Detalhes, propósito ou regras operacionais desta frente." />
                      </div>
                    </div>
                  )}
                </form>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setIsFrontModalOpen(false)} className="px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" form="front-form" disabled={submitting} className="px-6 py-3 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-lg shadow-teal-500/30 flex items-center gap-2 active:scale-95">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Salvar Frente
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>


      {/* SUBDIVISION MODAL (SLIDE-OVER) */}
      <AnimatePresence>
        {isSubModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsSubModalOpen(false)} />
            <motion.div 
              initial={{ x: '100%', opacity: 0.5 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-[70] w-full max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-black text-slate-900">{selectedSub ? 'Editar Subdivisão (Célula)' : 'Nova Subdivisão (Célula)'}</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">Times menores que operacionalizam a frente.</p>
                </div>
                <button onClick={() => setIsSubModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"><X className="h-5 w-5" /></button>
              </div>

              <div className="flex px-6 border-b border-slate-100 mt-2">
                <button onClick={() => setActiveTab('BASICO')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'BASICO' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                  <FolderTree className="h-4 w-4" /> Básico & Liderança
                </button>
                <button onClick={() => setActiveTab('AVANCADO')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'AVANCADO' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                  <FileText className="h-4 w-4" /> Notas
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form id="sub-form" onSubmit={handleSubSubmit} className="space-y-6">
                  {activeTab === 'BASICO' && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Nome da Célula <span className="text-teal-500">*</span></label>
                        <input required type="text" value={subFormData.name} onChange={e => setSubFormData({...subFormData, name: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all bg-slate-50 focus:bg-white" placeholder="Ex: Fiscal - Squad A" />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Líder Responsável</label>
                        <select value={subFormData.leaderId} onChange={e => setSubFormData({...subFormData, leaderId: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all bg-slate-50 focus:bg-white appearance-none">
                          <option value="">Sem Líder Específico</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Status</label>
                        <select value={subFormData.status} onChange={e => setSubFormData({...subFormData, status: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all bg-slate-50 focus:bg-white appearance-none">
                          <option value="ACTIVE">Ativo</option>
                          <option value="INACTIVE">Inativo</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {activeTab === 'AVANCADO' && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Anotações Internas da Célula</label>
                        <textarea value={subFormData.observations} onChange={e => setSubFormData({...subFormData, observations: e.target.value})} rows={6} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all bg-slate-50 focus:bg-white resize-none" placeholder="Detalhes de foco técnico, clientes de exceção..." />
                      </div>
                    </div>
                  )}
                </form>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setIsSubModalOpen(false)} className="px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" form="sub-form" disabled={submitting} className="px-6 py-3 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-lg shadow-teal-500/30 flex items-center gap-2 active:scale-95">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Salvar Célula
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
