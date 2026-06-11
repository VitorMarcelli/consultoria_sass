'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  X, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Filter,
  Briefcase,
  PhoneCall,
  ScrollText
} from 'lucide-react';
import { apiRequest } from '@/utils/api';

interface Client {
  id: string;
  name: string;
  cnpj: string | null;
  status: string;
  createdAt: string;
  email?: string | null;
  phone?: string | null;
  contactName?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  zipCode?: string | null;
  city?: string | null;
  state?: string | null;
  ie?: string | null;
  im?: string | null;
  cnae?: string | null;
  foundationDate?: string | null;
  certificateExpiration?: string | null;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'identification' | 'contact' | 'legal'>('identification');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Details Modal State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [viewClient, setViewClient] = useState<Client | null>(null);

  const handleOpenDetailsModal = (client: Client) => {
    setViewClient(client);
    setIsDetailsModalOpen(true);
  };
  
  const initialFormState = { 
    name: '', cnpj: '', status: 'ACTIVE',
    email: '', phone: '', contactName: '',
    address: '', neighborhood: '', zipCode: '', city: '', state: '',
    ie: '', im: '', cnae: '', foundationDate: '', certificateExpiration: ''
  };
  const [formData, setFormData] = useState(initialFormState);
  
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirm State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch all clients
  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest('/clients');
      setClients(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar lista de clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setSelectedClient(null);
    setFormData(initialFormState);
    setActiveTab('identification');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (client: Client) => {
    setSelectedClient(client);
    setFormData({ 
      name: client.name || '', 
      cnpj: client.cnpj || '', 
      status: client.status || 'ACTIVE',
      email: client.email || '',
      phone: client.phone || '',
      contactName: client.contactName || '',
      address: client.address || '',
      neighborhood: client.neighborhood || '',
      zipCode: client.zipCode || '',
      city: client.city || '',
      state: client.state || '',
      ie: client.ie || '',
      im: client.im || '',
      cnae: client.cnae || '',
      foundationDate: client.foundationDate ? new Date(client.foundationDate).toISOString().split('T')[0] : '',
      certificateExpiration: client.certificateExpiration ? new Date(client.certificateExpiration).toISOString().split('T')[0] : ''
    });
    setActiveTab('identification');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle Form Submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('O nome do cliente é obrigatório.');
      setActiveTab('identification');
      return;
    }
    if (!formData.cnpj.trim()) {
      setFormError('O CNPJ do cliente é obrigatório.');
      setActiveTab('identification');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);

      const payload: any = {
        name: formData.name,
        cnpj: formData.cnpj.trim() || undefined,
        status: formData.status,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        contactName: formData.contactName.trim() || undefined,
        address: formData.address.trim() || undefined,
        neighborhood: formData.neighborhood.trim() || undefined,
        zipCode: formData.zipCode.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        ie: formData.ie.trim() || undefined,
        im: formData.im.trim() || undefined,
        cnae: formData.cnae.trim() || undefined,
        foundationDate: formData.foundationDate || undefined,
        certificateExpiration: formData.certificateExpiration || undefined
      };

      if (selectedClient) {
        // Edit Client
        await apiRequest(`/clients/${selectedClient.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        // Create Client
        await apiRequest('/clients', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      fetchClients();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar cliente.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteClient = async (id: string) => {
    try {
      setLoading(true);
      await apiRequest(`/clients/${id}`, {
        method: 'DELETE',
      });
      setDeleteConfirmId(null);
      fetchClients();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir cliente.');
      setLoading(false);
    }
  };

  // Filter clients
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.cnpj && client.cnpj.includes(searchTerm));
    
    const matchesStatus = statusFilter === 'ALL' || client.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-teal-500" />
            Gestão de Clientes
          </h1>
          <p className="text-slate-500 font-medium mt-1">Cadastre, gerencie e visualize o histórico de contas da sua consultoria.</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-xl hover:bg-slate-800 transition-all active:scale-95 duration-200 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Novo Cliente
        </button>
      </div>

      {/* Filter panel */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por nome ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 ml-2" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
          </select>
        </div>
      </div>

      {/* Main clients list table */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-teal-50 border border-teal-200 p-4 text-teal-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {loading && clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
          <Loader2 className="h-10 w-10 text-teal-500 animate-spin" />
          <p className="text-slate-500 font-bold text-sm">Carregando seus clientes...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 mb-6 shadow-inner">
            <Building2 className="h-8 w-8 text-teal-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900">Nenhum cliente cadastrado</h3>
          <p className="text-slate-500 font-medium mt-2 max-w-sm">Comece a cadastrar clientes para acompanhar métricas e projetos dentro do seu portal.</p>
          <button 
            onClick={handleOpenCreateModal}
            className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-xl hover:bg-slate-800 transition-all duration-200"
          >
            Adicionar Primeiro Cliente
          </button>
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-200 bg-white rounded-3xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4.5 text-xs font-bold uppercase tracking-wider text-slate-400">Cliente</th>
                  <th className="px-6 py-4.5 text-xs font-bold uppercase tracking-wider text-slate-400">CNPJ</th>
                  <th className="px-6 py-4.5 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-6 py-4.5 text-xs font-bold uppercase tracking-wider text-slate-400">Data de Cadastro</th>
                  <th className="px-6 py-4.5 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5.5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-50 to-orange-50 border border-teal-100 flex items-center justify-center font-black text-teal-600">
                          {client.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm hover:text-teal-500 transition-colors cursor-pointer" onClick={() => handleOpenDetailsModal(client)}>{client.name}</p>
                          <p className="text-xs font-medium text-slate-400 mt-0.5">ID: {client.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5.5 text-sm font-semibold text-slate-600">
                      {client.cnpj || '—'}
                    </td>
                    <td className="px-6 py-5.5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        client.status === 'ACTIVE' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${client.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {client.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-5.5 text-sm font-semibold text-slate-500">
                      {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-5.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {deleteConfirmId === client.id ? (
                          <div className="flex items-center gap-1 bg-teal-50 border border-teal-100 rounded-lg p-1">
                            <span className="text-xs font-bold text-teal-700 px-2">Excluir?</span>
                            <button 
                              onClick={() => handleDeleteClient(client.id)}
                              className="rounded bg-teal-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-teal-700 transition-colors"
                            >
                              Sim
                            </button>
                            <button 
                              onClick={() => setDeleteConfirmId(null)}
                              className="rounded bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleOpenEditModal(client)}
                              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Editar cliente"
                            >
                              <Edit3 className="h-4.5 w-4.5" />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirmId(client.id)}
                              className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                              title="Excluir cliente"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
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

      {/* Modal - Slide in from right (Premium UI Side Panel) */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200"
            >
              {/* Modal Header */}
              <div className="flex h-20 items-center justify-between px-6 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {selectedClient ? 'Editar Cliente' : 'Novo Cliente'}
                  </h2>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    {selectedClient ? 'Modifique os dados do cliente' : 'Insira um novo cliente no sistema'}
                  </p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col justify-between overflow-y-auto bg-slate-50/50">
                
                {/* Tabs Header */}
                <div className="flex border-b border-slate-200 px-6 bg-white sticky top-0 z-10 pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('identification')}
                    className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      activeTab === 'identification' 
                        ? 'border-teal-500 text-teal-600' 
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Identificação
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('contact')}
                    className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      activeTab === 'contact' 
                        ? 'border-teal-500 text-teal-600' 
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Contato & Endereço
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('legal')}
                    className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      activeTab === 'legal' 
                        ? 'border-teal-500 text-teal-600' 
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Fiscais
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  
                  {formError && (
                    <div className="flex items-center gap-3 rounded-xl bg-teal-50 border border-teal-200 p-4.5 text-teal-700">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <p className="text-xs font-bold leading-relaxed">{formError}</p>
                    </div>
                  )}

                  {/* IDENTIFICATION TAB */}
                  {activeTab === 'identification' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nome / Razão Social *</label>
                        <input 
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                          disabled={formSubmitting}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">CNPJ *</label>
                        <input 
                          type="text"
                          value={formData.cnpj}
                          onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                          disabled={formSubmitting}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Data de Abertura</label>
                          <input 
                            type="date"
                            value={formData.foundationDate}
                            onChange={(e) => setFormData({ ...formData, foundationDate: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                            disabled={formSubmitting}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Status</label>
                          <div className="flex h-11 rounded-xl border border-slate-200 overflow-hidden bg-white p-1">
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, status: 'ACTIVE' })}
                              className={`flex-1 text-xs font-bold rounded-lg transition-all ${
                                formData.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'
                              }`}
                            >
                              Ativo
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, status: 'INACTIVE' })}
                              className={`flex-1 text-xs font-bold rounded-lg transition-all ${
                                formData.status === 'INACTIVE' ? 'bg-slate-200 text-slate-700' : 'text-slate-500 hover:bg-slate-50'
                              }`}
                            >
                              Inativo
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CONTACT TAB */}
                  {activeTab === 'contact' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Contato Principal (Nome)</label>
                        <input 
                          type="text"
                          value={formData.contactName}
                          onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">E-mail</label>
                          <input 
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Telefone / WhatsApp</label>
                          <input 
                            type="text"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                          />
                        </div>
                      </div>
                      <hr className="border-slate-200 my-4" />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">CEP</label>
                          <input 
                            type="text"
                            value={formData.zipCode}
                            onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Cidade / UF</label>
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              placeholder="Cidade"
                              value={formData.city}
                              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                              className="w-2/3 px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                            />
                            <input 
                              type="text"
                              placeholder="UF"
                              value={formData.state}
                              maxLength={2}
                              onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                              className="w-1/3 px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Endereço (Logradouro, nº, compl)</label>
                        <input 
                          type="text"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Bairro</label>
                        <input 
                          type="text"
                          value={formData.neighborhood}
                          onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* LEGAL TAB */}
                  {activeTab === 'legal' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Insc. Estadual</label>
                          <input 
                            type="text"
                            value={formData.ie}
                            onChange={(e) => setFormData({ ...formData, ie: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Insc. Municipal</label>
                          <input 
                            type="text"
                            value={formData.im}
                            onChange={(e) => setFormData({ ...formData, im: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">CNAE Principal</label>
                        <input 
                          type="text"
                          value={formData.cnae}
                          onChange={(e) => setFormData({ ...formData, cnae: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                        />
                      </div>
                      <hr className="border-slate-200 my-4" />
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Vencimento Certificado Digital</label>
                        <input 
                          type="date"
                          value={formData.certificateExpiration}
                          onChange={(e) => setFormData({ ...formData, certificateExpiration: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                        />
                      </div>
                    </div>
                  )}

                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    disabled={formSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 rounded-xl bg-slate-950 text-sm font-bold text-white hover:bg-slate-800 shadow-xl transition-all flex items-center justify-center gap-2"
                    disabled={formSubmitting}
                  >
                    {formSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Salvar Cliente
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {isDetailsModalOpen && viewClient && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden my-auto border border-slate-200/60"
            >
              {/* Header */}
              <div className="relative bg-slate-950 p-8 sm:px-10 text-white overflow-hidden">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-teal-500 rounded-full blur-[80px] opacity-40"></div>
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-5">
                    <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black text-white shadow-inner">
                      {viewClient.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">{viewClient.name}</h2>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm font-medium text-slate-300">ID: {viewClient.id.substring(0, 8)}</span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          viewClient.status === 'ACTIVE' 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-white/10 text-slate-300 border border-white/10'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${viewClient.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                          {viewClient.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsDetailsModalOpen(false)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all backdrop-blur-md"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-8 sm:px-10 space-y-8 bg-slate-50/50">
                
                {/* Section 1: Contact & Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Contact info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-teal-600 mb-2">
                      <PhoneCall className="h-5 w-5" />
                      <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900">Contato</h3>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Focal Point</p>
                        <p className="font-semibold text-slate-800">{viewClient.contactName || 'Não informado'}</p>
                      </div>
                      <hr className="border-slate-100" />
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">E-mail</p>
                        <p className="font-semibold text-slate-800">{viewClient.email || 'Não informado'}</p>
                      </div>
                      <hr className="border-slate-100" />
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telefone / Whats</p>
                        <p className="font-semibold text-slate-800">{viewClient.phone || 'Não informado'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Address info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-teal-600 mb-2">
                      <Briefcase className="h-5 w-5" />
                      <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900">Localização</h3>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3 h-full">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Endereço Completo</p>
                        <p className="font-semibold text-slate-800">
                          {viewClient.address ? `${viewClient.address}${viewClient.neighborhood ? `, ${viewClient.neighborhood}` : ''}` : 'Endereço não informado'}
                        </p>
                      </div>
                      <hr className="border-slate-100" />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cidade / UF</p>
                          <p className="font-semibold text-slate-800">
                            {viewClient.city ? `${viewClient.city} - ${viewClient.state || ''}` : 'Não informado'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">CEP</p>
                          <p className="font-semibold text-slate-800">{viewClient.zipCode || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Fiscal & Legal */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-teal-600 mb-2">
                    <ScrollText className="h-5 w-5" />
                    <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900">Dados Fiscais & Institucionais</h3>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100">
                      <div className="p-5">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">CNPJ</p>
                        <p className="font-bold text-slate-800">{viewClient.cnpj || '—'}</p>
                      </div>
                      <div className="p-5">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">CNAE Principal</p>
                        <p className="font-bold text-slate-800">{viewClient.cnae || '—'}</p>
                      </div>
                      <div className="p-5">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Insc. Estadual</p>
                        <p className="font-bold text-slate-800">{viewClient.ie || '—'}</p>
                      </div>
                      <div className="p-5">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Insc. Municipal</p>
                        <p className="font-bold text-slate-800">{viewClient.im || '—'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 border-t border-slate-100 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                      <div className="p-5 bg-slate-50/50">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Data de Abertura</p>
                        <p className="font-bold text-slate-800">
                          {viewClient.foundationDate ? new Date(viewClient.foundationDate).toLocaleDateString('pt-BR') : '—'}
                        </p>
                      </div>
                      <div className="p-5 bg-slate-50/50">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Vencimento do Certificado</p>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800">
                            {viewClient.certificateExpiration ? new Date(viewClient.certificateExpiration).toLocaleDateString('pt-BR') : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
