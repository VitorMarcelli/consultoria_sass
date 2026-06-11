'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserCog, 
  Plus, 
  Search, 
  Loader2,
  X,
  User,
  Wallet,
  FileText,
  Mail
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email?: string;
  role: string;
  status: string;
  grossSalary?: number;
  observations?: string;
}

const initialEmployees: Employee[] = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@sevilha.com.br',
    role: 'Liderança',
    status: 'ACTIVE',
    grossSalary: 12000,
    observations: 'Coordenador da equipe.'
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria@sevilha.com.br',
    role: 'Analista',
    status: 'ACTIVE',
    grossSalary: 7500,
    observations: 'Especialista na área contábil.'
  },
  {
    id: '3',
    name: 'Carlos Oliveira',
    email: 'carlos@sevilha.com.br',
    role: 'Assistente',
    status: 'INACTIVE',
    grossSalary: 4000,
    observations: 'Pausado por licença.'
  }
];

const initialFormState = {
  name: '',
  email: '',
  role: 'Analista',
  status: 'ACTIVE',
  grossSalary: '',
  observations: ''
};

export default function EquipePage() {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('PERFIL'); // PERFIL, AVANCADO
  const [submitting, setSubmitting] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  
  // Details Modal
  const [detailsModalEmployee, setDetailsModalEmployee] = useState<Employee | null>(null);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleOpenCreateModal = () => {
    setSelectedEmployee(null);
    setFormData(initialFormState);
    setActiveTab('PERFIL');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormData({
      name: emp.name,
      email: emp.email || '',
      role: emp.role,
      status: emp.status,
      grossSalary: emp.grossSalary ? String(emp.grossSalary) : '',
      observations: emp.observations || ''
    });
    setActiveTab('PERFIL');
    setIsModalOpen(true);
    setDetailsModalEmployee(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert('O nome é obrigatório.');
      return;
    }

    setSubmitting(true);
    
    // Simulate API delay
    setTimeout(() => {
      const payload: Employee = {
        id: selectedEmployee ? selectedEmployee.id : String(Date.now()),
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        grossSalary: formData.grossSalary ? parseFloat(formData.grossSalary) : undefined,
        observations: formData.observations
      };
      
      if (selectedEmployee) {
        setEmployees(employees.map(emp => emp.id === selectedEmployee.id ? payload : emp));
      } else {
        setEmployees([payload, ...employees]);
      }
      
      setIsModalOpen(false);
      setSubmitting(false);
    }, 500);
  };

  const handleDelete = (id: string) => {
    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      setEmployees(employees.filter(emp => emp.id !== id));
      setDeleteConfirmId(null);
      setDetailsModalEmployee(null);
      setLoading(false);
    }, 500);
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'ALL' || emp.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [employees, searchTerm, statusFilter]);

  const getInitials = (name: string) => {
    if (!name) return 'EX';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <UserCog className="h-8 w-8 text-teal-500" />
            Equipe do Escritório
          </h1>
          <p className="text-slate-500 font-medium mt-1">Gerencie os colaboradores, analistas e lideranças da contabilidade.</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-xl hover:bg-slate-800 transition-all active:scale-95 duration-200 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Novo Colaborador
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nome ou email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 shrink-0 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['ALL', 'ACTIVE', 'INACTIVE'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                  statusFilter === status 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {status === 'ALL' ? 'Todos' : status === 'ACTIVE' ? 'Ativos' : 'Inativos'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
          <Loader2 className="h-10 w-10 text-teal-500 animate-spin" />
        </div>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 mb-6 shadow-inner">
            <UserCog className="h-8 w-8 text-teal-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900">Nenhum colaborador cadastrado</h3>
          <p className="text-slate-500 font-medium mt-2 max-w-sm">Comece a mapear a operação inserindo sua equipe.</p>
          <button 
            onClick={handleOpenCreateModal}
            className="mt-6 text-teal-600 font-bold hover:text-teal-700 transition-colors"
          >
            Adicionar o primeiro colaborador &rarr;
          </button>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="py-20 text-center bg-white border border-slate-200 rounded-3xl shadow-sm">
          <p className="text-slate-500 font-medium">Nenhum colaborador encontrado com esses filtros.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold">Colaborador</th>
                  <th className="px-6 py-4 font-bold">Cargo / Função</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center text-teal-700 font-bold border border-teal-100 shadow-sm">
                          {getInitials(employee.name)}
                        </div>
                        <div>
                          <button 
                            onClick={() => setDetailsModalEmployee(employee)}
                            className="font-bold text-slate-900 hover:text-teal-600 transition-colors text-left"
                          >
                            {employee.name}
                          </button>
                          <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                            <Mail className="h-3 w-3" />
                            {employee.email || 'Sem e-mail'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                        {employee.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${employee.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        <span className="relative flex h-2 w-2">
                          {employee.status === 'ACTIVE' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${employee.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        </span>
                        {employee.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {deleteConfirmId === employee.id ? (
                          <div className="flex items-center gap-1 bg-teal-50 border border-teal-100 rounded-lg p-1 animate-in fade-in zoom-in duration-200">
                            <span className="text-xs font-bold text-teal-700 px-2">Confirmar?</span>
                            <button onClick={() => handleDelete(employee.id)} className="rounded bg-teal-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-teal-700 transition-colors">Sim</button>
                            <button onClick={() => setDeleteConfirmId(null)} className="rounded bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">Não</button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => handleOpenEditModal(employee)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm transition-all">Editar</button>
                            <button onClick={() => setDeleteConfirmId(employee.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-teal-600 hover:bg-teal-50 border border-transparent hover:border-teal-100 transition-all">Excluir</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE/EDIT MODAL (SLIDE-OVER) */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-[70] w-full max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-black text-slate-900">{selectedEmployee ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">Preencha as informações da equipe.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* TABS */}
              <div className="flex px-6 border-b border-slate-100 mt-2">
                <button 
                  onClick={() => setActiveTab('PERFIL')}
                  className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'PERFIL' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                >
                  <User className="h-4 w-4" /> Perfil
                </button>
                <button 
                  onClick={() => setActiveTab('AVANCADO')}
                  className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'AVANCADO' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                >
                  <Wallet className="h-4 w-4" /> Financeiro / Notas
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form id="employee-form" onSubmit={handleSubmit} className="space-y-6">
                  
                  {activeTab === 'PERFIL' && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Nome Completo <span className="text-teal-500">*</span></label>
                        <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all bg-slate-50 focus:bg-white" placeholder="Ex: Ana Souza" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">E-mail</label>
                        <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all bg-slate-50 focus:bg-white" placeholder="Ex: ana@consultoria.com.br" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5">Cargo / Função</label>
                          <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all bg-slate-50 focus:bg-white appearance-none">
                            <option value="Liderança">Liderança</option>
                            <option value="Analista">Analista</option>
                            <option value="Assistente">Assistente</option>
                            <option value="Sócio">Sócio(a)</option>
                            <option value="Outro">Outro</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5">Status</label>
                          <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all bg-slate-50 focus:bg-white appearance-none">
                            <option value="ACTIVE">Ativo</option>
                            <option value="INACTIVE">Inativo</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'AVANCADO' && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Salário Bruto Mensal</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <span className="text-slate-500 font-medium text-sm">R$</span>
                          </div>
                          <input 
                            type="number" 
                            step="0.01"
                            value={formData.grossSalary} 
                            onChange={e => setFormData({...formData, grossSalary: e.target.value})} 
                            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all bg-slate-50 focus:bg-white" 
                            placeholder="0,00" 
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 ml-1">Utilizado para calcular custo/hora nas análises de viabilidade de entregas.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                          Anotações e Observações Internas
                        </label>
                        <textarea 
                          value={formData.observations} 
                          onChange={e => setFormData({...formData, observations: e.target.value})} 
                          rows={6}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all bg-slate-50 focus:bg-white resize-none" 
                          placeholder="Adicione notas sobre evolução, ferramentas utilizadas, horário de trabalho, etc." 
                        />
                      </div>
                    </div>
                  )}

                </form>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" form="employee-form" disabled={submitting} className="px-6 py-3 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-lg shadow-teal-500/30 flex items-center gap-2 active:scale-95">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Salvar Colaborador
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DETAILS MODAL POPUP */}
      <AnimatePresence>
        {detailsModalEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setDetailsModalEmployee(null); }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header Profile */}
              <div className="bg-gradient-to-br from-teal-600 to-teal-700 p-8 relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 p-4">
                  <button onClick={() => setDetailsModalEmployee(null)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="absolute -bottom-24 -right-24 h-64 w-64 bg-white/10 rounded-full blur-3xl"></div>
                
                <div className="flex items-center gap-5 relative z-10">
                  <div className="h-20 w-20 rounded-2xl bg-white text-teal-600 flex items-center justify-center text-3xl font-black shadow-xl">
                    {getInitials(detailsModalEmployee.name)}
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">{detailsModalEmployee.name}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full backdrop-blur-md border border-white/10">
                        {detailsModalEmployee.role}
                      </span>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full backdrop-blur-md border ${detailsModalEmployee.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-100 border-emerald-500/30' : 'bg-slate-900/30 text-slate-200 border-slate-500/30'}`}>
                        {detailsModalEmployee.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                        <User className="h-4 w-4" /> Informações de Contato
                      </h3>
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-xs font-bold text-slate-500 mb-1">E-mail</p>
                          <p className="text-sm font-semibold text-slate-900">{detailsModalEmployee.email || 'Não informado'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                        <Wallet className="h-4 w-4" /> Financeiro
                      </h3>
                      <div className="space-y-4">
                        <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100/50">
                          <p className="text-xs font-bold text-teal-600 mb-1">Salário Bruto</p>
                          <p className="text-lg font-black text-slate-900">{formatCurrency(detailsModalEmployee.grossSalary)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Full Width Row */}
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <FileText className="h-4 w-4" /> Observações Internas
                  </h3>
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    {detailsModalEmployee.observations ? (
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{detailsModalEmployee.observations}</p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Nenhuma observação registrada para este colaborador.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button 
                  onClick={() => handleOpenEditModal(detailsModalEmployee)} 
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                >
                  Editar Dados
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
