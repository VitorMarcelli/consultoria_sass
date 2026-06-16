'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Loader2, Shield, UserCircle, Briefcase, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '@/utils/api';

const tableVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export default function ConsultoresPage() {
  const [consultores, setConsultores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConsultor, setSelectedConsultor] = useState<any>(null);

  // Form state
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  // Delete modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [consultantToDelete, setConsultantToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/users');
      setConsultores(data || []);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredConsultores = consultores.filter(c => 
    c.role === 'CONSULTANT' && (
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const openNewConsultor = () => {
    setSelectedConsultor(null);
    setNovoNome('');
    setNovoEmail('');
    setNovaSenha('');
    setConfirmarSenha('');
    setIsModalOpen(true);
  };

  const openEditConsultor = (consultor: any) => {
    setSelectedConsultor(consultor);
    setNovoNome(consultor.name);
    setNovoEmail(consultor.email);
    setIsModalOpen(true);
  };

  const handleSaveConsultor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim() || !novoEmail.trim()) return;

    if (!selectedConsultor) {
      if (novaSenha !== confirmarSenha) {
        alert('As senhas não coincidem!');
        return;
      }
      if (novaSenha.length < 6) {
        alert('A senha deve ter no mínimo 6 caracteres.');
        return;
      }
    }

    setSaving(true);
    try {
      if (selectedConsultor) {
        // Implementar edição de nome futuramente se necessário.
        alert('A edição de dados ainda será implementada.');
      } else {
        const novoCons = await apiRequest('/users/consultant', {
          method: 'POST',
          body: JSON.stringify({ 
            name: novoNome, 
            email: novoEmail, 
            password: novaSenha 
          })
        });
        setConsultores([novoCons, ...consultores]);
        alert('Consultor criado com sucesso! Ele já possui um Escritório exclusivo e pode fazer login.');
      }
      setIsModalOpen(false);
      setNovoNome('');
      setNovoEmail('');
      setNovaSenha('');
      setConfirmarSenha('');
      setSelectedConsultor(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Ocorreu um erro ao criar o consultor.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (consultor: any) => {
    setConsultantToDelete(consultor);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!consultantToDelete) return;
    setIsDeleting(true);
    try {
      await apiRequest(`/users/consultant/${consultantToDelete.id}`, {
        method: 'DELETE'
      });
      setConsultores(consultores.filter(c => c.id !== consultantToDelete.id));
      alert('Consultor removido e escritório descontinuado com sucesso!');
      setDeleteModalOpen(false);
      setConsultantToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao remover consultor.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative pb-20">
      {/* Header com animação */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-inner flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <UserCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Consultores</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Gestão de consultores e acessos aos seus escritórios.</p>
          </div>
        </div>
        <button 
          onClick={openNewConsultor}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-inner hover:bg-indigo-600 transition-all font-bold text-sm shadow-xl hover:shadow-indigo-600/30 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          Convidar Consultor
        </button>
      </motion.div>

      {/* Tabela e Filtros */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full max-w-md">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar membro por nome ou e-mail..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all hover:border-slate-300 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-inner border border-slate-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-bold text-slate-600">{filteredConsultores.filter(c => c.status === 'ACTIVE').length} Ativos</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-inner border border-slate-200 shadow-sm">
              <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs font-bold text-slate-600">{filteredConsultores.length} Total</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-slate-400 uppercase tracking-widest bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-8 py-5 font-bold">Usuário</th>
                <th className="px-8 py-5 font-bold">Cargo & Acesso</th>
                <th className="px-8 py-5 font-bold">Status</th>
                <th className="px-8 py-5 font-bold">Escritórios (Tenants)</th>
                <th className="px-8 py-5 text-right font-bold w-32">Ações</th>
              </tr>
            </thead>
            
            {loading ? (
              <tbody>
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-bold text-sm">Carregando membros da equipe...</p>
                  </td>
                </tr>
              </tbody>
            ) : filteredConsultores.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
                      <Search className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="font-bold text-slate-700 text-lg mb-1">Nenhum membro encontrado</p>
                    <p className="text-sm font-medium text-slate-400">Verifique a busca ou convide um novo membro.</p>
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
                  {filteredConsultores.map((consultor) => (
                    <motion.tr 
                      variants={rowVariants}
                      key={consultor.id} 
                      className="bg-white hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-black border border-indigo-200/50">
                            {consultor.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{consultor.name}</h3>
                            <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" /> {consultor.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider ring-1 ring-slate-500/20">
                              <Briefcase className="w-3 h-3" /> Consultor
                            </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ring-1 ${
                          consultor.status === 'ACTIVE' 
                            ? 'bg-emerald-100 text-emerald-700 ring-emerald-500/20' 
                            : 'bg-rose-100 text-rose-700 ring-rose-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${consultor.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {consultor.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex -space-x-2">
                          {consultor.managedTenants?.slice(0, 3).map((tenant: any, i: number) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600" title={tenant.name}>
                              {tenant.name?.charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {consultor.managedTenants?.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                              +{consultor.managedTenants.length - 3}
                            </div>
                          )}
                          {!consultor.managedTenants?.length && (
                            <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">Nenhum</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openEditConsultor(consultor)}
                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-xl hover:bg-indigo-50"
                            title="Editar acesso"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => confirmDelete(consultor)}
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-xl hover:bg-rose-50"
                            title="Revogar acesso"
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

      {/* Modal Glassmorphism */}
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
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white/90 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-inner flex items-center justify-center">
                    {selectedConsultor ? <Edit2 className="w-5 h-5" /> : <UserCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{selectedConsultor ? 'Editar Consultor' : 'Convidar Consultor'}</h2>
                    <p className="text-xs font-semibold text-slate-500">Criação de usuário e escritório</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveConsultor} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nome Completo</label>
                  <input 
                    type="text" 
                    required 
                    value={novoNome} 
                    onChange={(e) => setNovoNome(e.target.value)} 
                    className="w-full px-5 py-3.5 bg-white/50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all hover:border-slate-300" 
                    placeholder="Ex: João Silva" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">E-mail Profissional</label>
                  <input 
                    type="email" 
                    required 
                    value={novoEmail} 
                    onChange={(e) => setNovoEmail(e.target.value)} 
                    className="w-full px-5 py-3.5 bg-white/50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all hover:border-slate-300" 
                    placeholder="joao.silva@empresa.com" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Senha de Acesso</label>
                  <input 
                    type="password" 
                    required={!selectedConsultor} 
                    value={novaSenha} 
                    onChange={(e) => setNovaSenha(e.target.value)} 
                    className="w-full px-5 py-3.5 bg-white/50 border border-slate-200 rounded-inner text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all hover:border-slate-300" 
                    placeholder="••••••••" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Confirmar Senha</label>
                  <input 
                    type="password" 
                    required={!selectedConsultor} 
                    value={confirmarSenha} 
                    onChange={(e) => setConfirmarSenha(e.target.value)} 
                    className="w-full px-5 py-3.5 bg-white/50 border border-slate-200 rounded-inner text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all hover:border-slate-300" 
                    placeholder="••••••••" 
                  />
                  <p className="text-[11px] font-medium text-slate-500 mt-2 px-1">
                    Um Escritório particular será criado automaticamente para este consultor.
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 mt-8">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors">Cancelar</button>
                  <button type="submit" disabled={saving} className="px-8 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center gap-2">
                    {saving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Salvando</>
                    ) : (
                      selectedConsultor ? 'Salvar Edição' : 'Enviar Convite'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Modal de Confirmação de Exclusão */}
      <AnimatePresence>
        {deleteModalOpen && consultantToDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setDeleteModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white/90 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-900">Excluir Consultor?</h2>
                <p className="text-sm font-medium text-slate-500">
                  Tem certeza que deseja remover <b>{consultantToDelete.name}</b> do sistema? 
                </p>
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold p-4 rounded-xl mt-4 text-left">
                  O Escritório atrelado a este consultor será automaticamente desvinculado e marcado como <b>DESCONTINUADO</b>. Você poderá visualizá-lo e reativá-lo na aba de Escritórios posteriormente.
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="flex-1 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={executeDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-lg shadow-red-600/20 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sim, Excluir'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
