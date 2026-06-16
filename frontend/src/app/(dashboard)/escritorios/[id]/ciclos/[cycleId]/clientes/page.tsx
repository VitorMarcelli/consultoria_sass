'use client';

import React, { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Loader2, Building2, Plus, Upload, Trash2, Edit2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiRequest } from '@/utils/api';
import ClientModal from '@/components/ClientModal';
import CsvImportModal from '@/components/CsvImportModal';
import Client360SlideOver from '@/components/Client360SlideOver';
import AllocateClientModal from './AllocateClientModal';
import ClientCycleModal from './ClientCycleModal';
import { motion, AnimatePresence } from 'framer-motion';

const tableVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export default function CycleClientsPage({
  params,
}: {
  params: Promise<{ id: string; cycleId: string }>;
}) {
  const { id, cycleId } = use(params);

  const searchParams = useSearchParams();
  const frontId = searchParams.get('frontId') || '';
  const subdivisionId = searchParams.get('subdivisionId') || '';

  const [clientes, setClientes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false); // Used only for editing now
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false); // Used for creation
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedClientFor360, setSelectedClientFor360] = useState<any>(null);
  const [is360Open, setIs360Open] = useState(false);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      let url = `/management-cycles/${cycleId}/clients?tenantId=${id}`;
      if (frontId) url += `&frontId=${frontId}`;
      if (subdivisionId) url += `&subdivisionId=${subdivisionId}`;

      const data = await apiRequest(url);
      setClientes(data || []);
    } catch (err) {
      console.error('Erro ao buscar clientes do ciclo:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [id, cycleId, frontId, subdivisionId]);

  const handleSaveClient = async (clientData: any) => {
    setIsSaving(true);
    try {
      if (editingClient) {
        // Edit (Global update, mas reflete no cycle se regarregar)
        await apiRequest(`/clients/${editingClient.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ tenantId: id, ...clientData }),
        });
        setIsClientModalOpen(false);
        setEditingClient(null);
        await loadClients();
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar cliente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportCsv = async (file: File) => {
    setIsSaving(true);
    try {
      let lines: any[] = [];
      
      if (file.name.endsWith('.xlsx')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        lines = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as any[];
      } else {
        const text = await file.text();
        const workbook = XLSX.read(text, { type: 'string' });
        lines = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as any[];
      }
      
      if (lines.length === 0) {
        throw new Error('Arquivo vazio ou sem registros válidos');
      }
      
      const response = await apiRequest('/imports/clients-json', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: id,
          data: lines
        })
      });
      
      alert(response.message || `Importação de ${response.count} registros concluída com sucesso!`);
      setIsImportModalOpen(false);
      await loadClients();
    } catch (err: any) {
      throw new Error(err.message || 'Falha ao importar arquivo');
    } finally {
      setIsSaving(false);
    }
  };

  const openNewClient = () => {
    setEditingClient(null);
    setIsNewClientModalOpen(true);
  };

  const openEditClient = (client: any) => {
    setEditingClient(client);
    setIsClientModalOpen(true);
  };

  const uniqueClientes = Array.from(
    new Map(
      clientes
        .filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.cnpj?.includes(search))
        .map(c => [c.id, c])
    ).values()
  );

  const formatRegime = (regime: string) => {
    const map: Record<string, string> = {
      'SIMPLES_NACIONAL': 'Simples Nacional',
      'LUCRO_PRESUMIDO': 'Lucro Presumido',
      'LUCRO_REAL': 'Lucro Real'
    };
    return map[regime] || regime || '-';
  };

  const formatStatus = (status: string) => {
    const map: Record<string, { label: string, classes: string }> = {
      'ACTIVE': { label: 'Ativo', classes: 'bg-emerald-100 text-emerald-700 ring-emerald-500/20' },
      'INACTIVE': { label: 'Inativo', classes: 'bg-rose-100 text-rose-700 ring-rose-500/20' },
      'PREPARATION': { label: 'Preparação', classes: 'bg-amber-100 text-amber-700 ring-amber-500/20' }
    };
    
    const config = map[status] || { label: status || 'Desconhecido', classes: 'bg-slate-100 text-slate-700 ring-slate-500/20' };
    
    return (
      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ring-1 ${config.classes}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="relative">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
      >
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Carteira do Ciclo</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Gerencie a base de clientes alocada especificamente para este mês.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsAllocateModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl hover:bg-teal-600 transition-all font-bold text-sm shadow-xl hover:shadow-teal-600/30"
          >
            <Plus className="w-4 h-4" />
            Alocar Cliente da Base
          </button>
          <button 
            onClick={openNewClient}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all font-bold text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </button>
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all font-bold text-sm shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Importar
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
              placeholder="Buscar cliente por nome ou CNPJ neste ciclo..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300 shadow-sm"
            />
          </div>
          <div className="text-sm font-bold text-slate-400 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            Total neste ciclo: <span className="text-slate-900">{uniqueClientes.length}</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-slate-400 uppercase tracking-widest bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-8 py-5 font-bold">Razão Social</th>
                <th className="px-8 py-5 font-bold">CNPJ</th>
                <th className="px-8 py-5 font-bold">Regime Tributário</th>
                <th className="px-8 py-5 font-bold">Honorários (Neste Mês)</th>
                <th className="px-8 py-5 font-bold">Status Origem</th>
                <th className="px-8 py-5 text-right font-bold w-32">Ações</th>
              </tr>
            </thead>
            {isLoading ? (
              <tbody>
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-500" />
                    <p className="font-bold text-sm">Carregando carteira alocada...</p>
                  </td>
                </tr>
              </tbody>
            ) : uniqueClientes.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-500">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
                      <Building2 className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="font-bold text-slate-700 text-lg mb-1">Nenhum cliente neste ciclo</p>
                    <p className="text-sm font-medium text-slate-400 max-w-sm mx-auto">Cadastre novos clientes clicando no botão acima ou importe a planilha.</p>
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
                  {uniqueClientes.map((cliente) => (
                    <motion.tr 
                      variants={rowVariants}
                      key={cliente.id} 
                      className="bg-white hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <button 
                            onClick={() => {
                              setSelectedClientFor360(cliente);
                              setIs360Open(true);
                            }}
                            className="font-bold text-slate-900 group-hover:text-teal-600 hover:underline transition-colors text-left"
                          >
                            {cliente.name}
                          </button>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-slate-500 font-semibold">
                        {cliente.cnpj?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') || '-'}
                      </td>
                      <td className="px-8 py-5 text-slate-600 font-semibold">{formatRegime(cliente.taxRegime)}</td>
                      <td className="px-8 py-5 text-slate-600 font-semibold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cliente.monthlyFee || 0)}
                      </td>
                      <td className="px-8 py-5">
                        {formatStatus(cliente.status)}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openEditClient(cliente)}
                            className="p-2 text-slate-400 hover:text-teal-600 transition-colors rounded-xl hover:bg-teal-50"
                            title="Editar cliente"
                          >
                            <Edit2 className="w-4 h-4" />
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

      <ClientModal 
        isOpen={isClientModalOpen}
        onClose={() => { setIsClientModalOpen(false); setEditingClient(null); }}
        onSave={handleSaveClient}
        initialData={editingClient}
        isLoading={isSaving}
      />

      <ClientCycleModal 
        isOpen={isNewClientModalOpen}
        onClose={() => setIsNewClientModalOpen(false)}
        tenantId={id}
        cycleId={cycleId}
        onSuccess={loadClients}
      />

      <CsvImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportCsv}
        isLoading={isSaving}
      />

      <AllocateClientModal 
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        tenantId={id}
        cycleId={cycleId}
        onSuccess={loadClients}
      />

      <Client360SlideOver 
        isOpen={is360Open}
        onClose={() => setIs360Open(false)}
        client={selectedClientFor360}
        tenantId={id}
        cycleId={cycleId}
        onFrontRemoved={loadClients}
      />
    </div>
  );
}
