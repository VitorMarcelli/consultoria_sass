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
  const [systemOptions, setSystemOptions] = useState<any[]>([]);
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
    async function fetchData() {
      setLoading(true);
      try {
        const [tenantsData, usersData, optionsData] = await Promise.all([
          apiRequest('/tenants'),
          apiRequest('/users').catch(() => []),
          apiRequest('/system-options').catch(() => [])
        ]);
        setEscritorios(tenantsData || []);
        setConsultores(usersData || []);
        setSystemOptions(optionsData || []);
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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
    const dynamicOption = systemOptions.find(o => o.category === 'TENANT_STATUS' && o.value === status);
    if (dynamicOption) {
      const baseColor = dynamicOption.color || 'slate';
      return { 
        label: dynamicOption.label, 
        colors: `bg-${baseColor}-100 text-${baseColor}-700 border-${baseColor}-200` 
      };
    }

    // Fallbacks
    switch (status) {
      case 'ACTIVE': return { label: 'Ativo', colors: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'MAPPING': return { label: 'Mapeamento', colors: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 'INACTIVE': return { label: 'Inativo', colors: 'bg-slate-100 text-slate-600 border-slate-200' };
      default: return { label: 'Preparação', colors: 'bg-blue-100 text-blue-700 border-blue-200' };
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
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Sleek Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 relative z-20">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            Escritórios
            <span className="flex items-center justify-center bg-slate-900 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
              {escritorios.length}
            </span>
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1.5">Gestão inteligente e acompanhamento da sua carteira</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative flex items-center bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200/70 w-full sm:w-72 transition-shadow hover:shadow-md">
            <Search className="w-4 h-4 absolute left-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar escritórios..."
              className="w-full pl-9 pr-4 py-1.5 bg-transparent text-sm font-medium focus:outline-none placeholder:text-slate-400 text-slate-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            onClick={openCreateModal}
            className="flex items-center justify-center shrink-0 px-5 py-3 sm:py-2.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-all duration-300 font-bold text-sm shadow-[0_4px_12px_rgba(20,184,166,0.25)] hover:shadow-[0_6px_16px_rgba(20,184,166,0.35)] hover:-translate-y-0.5 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span>Novo Escritório</span>
          </button>
        </div>
      </div>

      <div className="relative z-10">
        {loading ? (
          <div className="py-20 flex flex-col justify-center items-center gap-4">
            <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
            <p className="text-slate-400 font-medium animate-pulse">Carregando carteira...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredEscritorios.map((escritorio) => {
                const statusInfo = getStatusLabel(escritorio.status);
                
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    key={escritorio.id}
                    className="group relative bg-white p-7 rounded-[2.5rem] border border-slate-100/80 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(20,184,166,0.1)] hover:-translate-y-1.5 transition-all duration-500 flex flex-col justify-between overflow-hidden"
                  >
                    {/* Subtle Background Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-teal-50 to-transparent rounded-bl-full transition-transform duration-500 group-hover:scale-125 opacity-50 pointer-events-none"></div>

                    <div className="absolute top-5 right-5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 translate-x-2 group-hover:translate-x-0 duration-300">
                      <button onClick={() => openEditModal(escritorio)} className="p-2 text-slate-400 hover:text-teal-600 bg-white/80 backdrop-blur-sm hover:bg-teal-50 rounded-xl transition-all shadow-sm border border-slate-100 hover:border-teal-100">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => confirmDelete(escritorio)} className="p-2 text-slate-400 hover:text-red-500 bg-white/80 backdrop-blur-sm hover:bg-red-50 rounded-xl transition-all shadow-sm border border-slate-100 hover:border-red-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-start justify-between mb-6 relative">
                        <div className="flex items-center gap-4 w-full">
                          <div className="w-14 h-14 shrink-0 rounded-[1.25rem] bg-gradient-to-br from-teal-50 to-white border border-teal-100/50 flex items-center justify-center text-teal-600 shadow-sm relative overflow-hidden group-hover:scale-110 transition-transform duration-500">
                            <Building2 className="w-6 h-6 relative z-10" />
                          </div>
                          <div className="min-w-0 flex-1 pr-20 relative z-10">
                            <h3 className="font-bold text-xl text-slate-900 tracking-tight truncate group-hover:text-teal-700 transition-colors" title={escritorio.name}>{escritorio.name}</h3>
                            <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block shrink-0"></span>
                              <span className="truncate">{escritorio._count?.users || 0} usuários vinculados</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-6">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${statusInfo.colors.replace('100', '50').replace('200', '100')} bg-opacity-50`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.colors.split(' ')[0].replace('bg-', 'bg-').replace('100', '500')} animate-pulse shadow-sm`}></span>
                          <span className="text-[10px] font-bold uppercase tracking-wider">{statusInfo.label}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-5 mt-auto border-t border-slate-100/80 flex items-center justify-between relative z-10">
                      <div className="text-sm flex flex-col">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Responsável</span>
                        <div className="flex items-center gap-2">
                          {escritorio.consultant ? (
                            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0">
                              {escritorio.consultant.name.substring(0, 2).toUpperCase()}
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-300 shrink-0">
                              --
                            </div>
                          )}
                          <span className="font-bold text-slate-700 truncate max-w-[140px]">
                            {escritorio.consultant?.name || 'Não atribuído'}
                          </span>
                        </div>
                      </div>
                      
                      <Link 
                        href={`/escritorios/${escritorio.id}/cadastro`}
                        className="flex items-center gap-2 px-4 py-2 shrink-0 rounded-xl bg-slate-50 text-slate-500 border border-slate-100 group-hover:bg-teal-500 group-hover:border-teal-500 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-[0_4px_15px_rgba(20,184,166,0.3)]"
                      >
                        <span className="text-xs font-bold">Acessar</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
              
              {filteredEscritorios.length === 0 && !loading && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="col-span-full py-24 text-center text-slate-500 bg-white/40 backdrop-blur-md rounded-[2rem] border border-slate-200/50 border-dashed flex flex-col items-center justify-center shadow-inner"
                >
                  <div className="w-20 h-20 rounded-3xl bg-slate-50/80 flex items-center justify-center mx-auto mb-5 border border-slate-200/50 shadow-sm relative">
                    <div className="absolute inset-0 bg-teal-400/5 blur-xl rounded-full"></div>
                    <Building2 className="w-10 h-10 text-slate-300 relative z-10" />
                  </div>
                  <h3 className="font-black text-xl text-slate-700 mb-2 tracking-tight">Nenhum escritório encontrado</h3>
                  <p className="text-sm font-medium text-slate-500 max-w-sm mx-auto">
                    Não encontramos resultados para a sua busca. Tente ajustar os termos ou adicione um novo escritório.
                  </p>
                </motion.div>
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
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-white rounded-2xl shadow-xl z-50 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
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
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm bg-white rounded-2xl shadow-xl z-50 p-6 text-center"
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
