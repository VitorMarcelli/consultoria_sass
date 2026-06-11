'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Building2, ArrowRight, X, Edit2, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/utils/api';

export default function EscritoriosPage() {
  const router = useRouter();
  
  const [escritorios, setEscritorios] = useState<any[]>([]);
  const [consultores, setConsultores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEscritorio, setSelectedEscritorio] = useState<any>(null);
  const [escritorioToDelete, setEscritorioToDelete] = useState<any>(null);
  
  // Form state
  const [novoNome, setNovoNome] = useState('');
  const [novoCnpj, setNovoCnpj] = useState('');
  const [novoConsultorId, setNovoConsultorId] = useState('');
  const [novoStatus, setNovoStatus] = useState('PREPARATION');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tenantsData, usersData] = await Promise.all([
        apiRequest('/tenants'),
        apiRequest('/users').catch(() => []) // Fallback in case of error
      ]);
      setEscritorios(tenantsData || []);
      setConsultores(usersData || []);
      
      // Default consultant selection if available, or keep empty for 'Ninguém'
      // Removing automatic selection of first user so 'Ninguém' is default
      // if (usersData && usersData.length > 0) {
      //   setNovoConsultorId(usersData[0].id);
      // }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEscritorios = escritorios.filter(esc => {
    const search = searchTerm.toLowerCase();
    const nomeMatch = esc.name?.toLowerCase().includes(search);
    const consultorMatch = esc.consultant?.name?.toLowerCase().includes(search);
    
    // Status translation for search matching
    const statusMap: Record<string, string> = {
      'PREPARATION': 'preparação',
      'MAPPING': 'mapeamento',
      'ACTIVE': 'ativo',
      'INACTIVE': 'inativo'
    };
    const statusMatch = statusMap[esc.status]?.includes(search);
    
    return nomeMatch || consultorMatch || statusMatch;
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return { label: 'Ativo', colors: 'bg-emerald-100 text-emerald-700' };
      case 'MAPPING': return { label: 'Mapeamento', colors: 'bg-amber-100 text-amber-700' };
      case 'INACTIVE': return { label: 'Inativo', colors: 'bg-slate-100 text-slate-600' };
      default: return { label: 'Preparação', colors: 'bg-blue-100 text-blue-700' };
    }
  };

  const openCreateModal = () => {
    setSelectedEscritorio(null);
    setNovoNome('');
    setNovoCnpj('');
    setNovoConsultorId('');
    setNovoStatus('PREPARATION');
    setIsModalOpen(true);
  };

  const openEditModal = (esc: any) => {
    setSelectedEscritorio(esc);
    setNovoNome(esc.name);
    setNovoCnpj(esc.cnpj || '');
    setNovoConsultorId(esc.consultantId || '');
    setNovoStatus(esc.status);
    setIsModalOpen(true);
  };

  const handleSaveOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;

    setSaving(true);
    try {
      if (selectedEscritorio) {
        // Edit mode (Backend integration for Edit is not fully mapped here yet, assuming PUT or PATCH)
        // For MVP frontend we might just mock the update locally if backend route doesn't exist
        const updated = await apiRequest(`/tenants/${selectedEscritorio.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: novoNome,
            cnpj: novoCnpj || undefined,
            consultantId: novoConsultorId, // empty string means Ninguém
            status: novoStatus
          })
        });
        
        setEscritorios(escritorios.map(esc => esc.id === selectedEscritorio.id ? updated : esc));
      } else {
        // Create mode
        const slug = novoNome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        
        const payload = {
          name: novoNome,
          cnpj: novoCnpj || undefined,
          slug: slug,
          consultantId: novoConsultorId || undefined
        };
        
        const novoEscritorio = await apiRequest('/tenants', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        
        // Append the consultant info so the UI renders it immediately
        const consultantInfo = consultores.find(c => c.id === novoConsultorId);
        if (consultantInfo) {
          novoEscritorio.consultant = consultantInfo;
        }
        
        setEscritorios([novoEscritorio, ...escritorios]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar o escritório');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (esc: any) => {
    setEscritorioToDelete(esc);
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!escritorioToDelete) return;
    
    try {
      await apiRequest(`/tenants/${escritorioToDelete.id}`, { method: 'DELETE' });
      setEscritorios(escritorios.filter(esc => esc.id !== escritorioToDelete.id));
      setIsDeleteModalOpen(false);
      setEscritorioToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir:', err);
      alert('Não foi possível excluir o escritório. Ele pode estar bloqueado ou o erro persistiu no servidor.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Escritórios</h1>
          <p className="text-slate-500 font-medium text-sm mt-2">Gestão da carteira de escritórios de contabilidade</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl hover:bg-teal-700 transition-all font-semibold text-sm shadow-md shadow-teal-600/20"
        >
          <Plus className="w-4 h-4" />
          Novo Escritório
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar escritório, consultor ou status..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-6 bg-slate-50/30">
            <AnimatePresence>
              {filteredEscritorios.map((escritorio) => {
                const statusInfo = getStatusLabel(escritorio.status);
                
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={escritorio.id}
                    className="border border-slate-200 rounded-2xl p-6 bg-white flex flex-col justify-between relative group hover:border-teal-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(escritorio)} className="p-2 text-slate-400 hover:text-teal-600 bg-white hover:bg-teal-50 rounded-xl transition-all shadow-sm border border-slate-100 hover:border-teal-100">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => confirmDelete(escritorio)} className="p-2 text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 rounded-xl transition-all shadow-sm border border-slate-100 hover:border-red-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-teal-50 to-white border border-teal-100 flex items-center justify-center text-teal-600 shadow-sm">
                            <Building2 className="w-6 h-6" />
                          </div>
                          <div className="min-w-0 pr-16">
                            <h3 className="font-bold text-lg text-slate-900 tracking-tight truncate" title={escritorio.name}>{escritorio.name}</h3>
                            <p className="text-sm font-medium text-slate-500 mt-0.5">
                              {escritorio._count?.users || 0} usuários
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shrink-0 border ${statusInfo.colors.replace('bg-', 'border-').replace('100', '200')} ${statusInfo.colors.split(' ')[0]}/50 ${statusInfo.colors.split(' ')[1]}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-5 mt-auto border-t border-slate-100 flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-slate-400 font-medium">Consultor: </span>
                        <span className="font-semibold text-slate-700">
                          {escritorio.consultant?.name || 'Não atribuído'}
                        </span>
                      </div>
                      
                      <Link 
                        href={`/escritorios/${escritorio.id}/cadastro`}
                        className="flex items-center justify-center w-9 h-9 shrink-0 rounded-xl bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white transition-all shadow-sm hover:shadow-teal-600/20"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
              
              {filteredEscritorios.length === 0 && !loading && (
                <div className="col-span-full py-16 text-center text-slate-500">
                  <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
                    <Building2 className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="font-bold text-slate-600 mb-1">Nenhum escritório encontrado</p>
                  <p className="text-sm">Tente ajustar a sua busca ou adicione um novo.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal Escritório */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedEscritorio ? 'Editar Escritório' : 'Novo Escritório'}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveOffice} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Nome do Escritório</label>
                  <input 
                    type="text" 
                    required
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300"
                    placeholder="Ex: Contabilidade Nova Era"
                  />
                </div>
                
                {!selectedEscritorio && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">CNPJ (Opcional na abertura)</label>
                    <input 
                      type="text" 
                      value={novoCnpj}
                      onChange={(e) => setNovoCnpj(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300"
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Consultor Responsável</label>
                    <select 
                      value={novoConsultorId}
                      onChange={(e) => setNovoConsultorId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300"
                    >
                      <option value="">Ninguém (Sem Consultor)</option>
                      {consultores.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Status</label>
                    <select 
                      value={novoStatus}
                      onChange={(e) => setNovoStatus(e.target.value)}
                      disabled={!selectedEscritorio} // Apenas edição pode forçar mudança manual
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300 disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      <option value="PREPARATION">Preparação</option>
                      <option value="MAPPING">Mapeamento</option>
                      <option value="ACTIVE">Ativo</option>
                      <option value="INACTIVE">Inativo</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 mt-6">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-md shadow-teal-600/20 disabled:opacity-70 flex items-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {selectedEscritorio ? 'Salvar Alterações' : 'Criar Escritório'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal Excluir */}
      <AnimatePresence>
        {isDeleteModalOpen && escritorioToDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-xl z-50 p-6 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Excluir Escritório?</h2>
              <p className="text-sm text-slate-500 mb-6">
                Tem certeza que deseja excluir <strong>{escritorioToDelete.name}</strong>? Esta ação removerá o acesso aos clientes vinculados e não poderá ser desfeita.
              </p>
              
              <div className="flex items-center justify-center gap-3">
                <button 
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-5 py-2.5 w-full text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={executeDelete}
                  className="px-5 py-2.5 w-full text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-sm"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
