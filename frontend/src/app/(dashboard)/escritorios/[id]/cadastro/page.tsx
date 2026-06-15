'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/utils/api';
import { Loader2, FileText, Building2, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import SystemOptionManagerModal from '@/components/SystemOptionManagerModal';

export default function CadastroEscritorioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consultores, setConsultores] = useState<any[]>([]);
  const [systemOptions, setSystemOptions] = useState<any[]>([]);
  const [role, setRole] = useState('CONSULTANT');
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; category: string; title: string; description: string; hasColor?: boolean }>({
    isOpen: false, category: '', title: '', description: '', hasColor: false
  });

  // Form State
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cityState, setCityState] = useState('');
  const [size, setSize] = useState('');
  const [status, setStatus] = useState('PREPARATION');
  const [consultantId, setConsultantId] = useState('');
  const [accountingSystem, setAccountingSystem] = useState('');
  const [observations, setObservations] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [tenantData, usersData, optionsData, meData] = await Promise.all([
          apiRequest(`/tenants/${id}`),
          apiRequest('/users'),
          apiRequest('/system-options').catch(() => []),
          apiRequest('/users/me').catch(() => null)
        ]);
        
        setSystemOptions(optionsData || []);
        setConsultores(usersData.filter((u: any) => u.role === 'CONSULTANT') || []);
        if (meData?.role) setRole(meData.role);
        
        if (tenantData) {
          setName(tenantData.name || '');
          setCnpj(tenantData.cnpj || '');
          setCityState(tenantData.city && tenantData.state ? `${tenantData.city} / ${tenantData.state}` : tenantData.city || tenantData.state || '');
          setSize(tenantData.size || '');
          setStatus(tenantData.status || 'PREPARATION');
          setConsultantId(tenantData.consultantId || '');
          setAccountingSystem(tenantData.accountingSystem || '');
          setObservations(tenantData.observations || '');
        }
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const reloadOptions = async () => {
    const data = await apiRequest('/system-options').catch(() => []);
    setSystemOptions(data || []);
  };

  const handleSaveAndNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Parse city / state if present
    let city = '';
    let state = '';
    if (cityState.includes('/')) {
      const parts = cityState.split('/');
      city = parts[0].trim();
      state = parts[1].trim();
    } else {
      city = cityState.trim();
    }

    try {
      await apiRequest(`/tenants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          cnpj: cnpj || undefined,
          city: city || undefined,
          state: state || undefined,
          size: size || undefined,
          status,
          consultantId,
          accountingSystem: accountingSystem || undefined,
          observations: observations || undefined
        })
      });
      router.push(`/escritorios/${id}/frentes`);
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      alert('Ocorreu um erro ao salvar. Verifique se o backend está rodando.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative">
      <SystemOptionManagerModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        category={modalConfig.category}
        title={modalConfig.title}
        description={modalConfig.description}
        hasColor={modalConfig.hasColor}
        onUpdated={reloadOptions}
      />
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-500/30 shrink-0">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Dados Cadastrais</h2>
            <p className="text-slate-500 font-medium mt-1">Informações básicas e gestão do projeto do escritório.</p>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSaveAndNext} className="max-w-4xl space-y-8">
        
        {/* Bloco 1: Informações Básicas */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4 relative z-10">
            <Building2 className="w-5 h-5 text-teal-500" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Informações Básicas</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nome do Escritório</label>
              <input 
                type="text" 
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300"
                placeholder="Ex: Contabilidade Alpha"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">CNPJ</label>
              <input 
                type="text" 
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Cidade / UF</label>
              <input 
                type="text" 
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300"
                value={cityState}
                onChange={(e) => setCityState(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1 ml-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Porte do Escritório</label>
                {role === 'ADMIN' && (
                  <button type="button" onClick={() => setModalConfig({isOpen: true, category: 'TENANT_SIZE', title: 'Porte do Escritório', description: 'Tamanhos disponíveis no cadastro', hasColor: false})} className="flex items-center gap-1 text-[10px] font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-md transition-colors">
                    <Settings className="w-3 h-3" /> Configurar
                  </button>
                )}
              </div>
              <select 
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300"
              >
                <option value="">Selecione...</option>
                {systemOptions.filter((o: any) => o.category === 'TENANT_SIZE').map((o: any) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}

              </select>
            </div>
          </div>
        </motion.div>

        {/* Bloco 2: Gestão do Projeto */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4 relative z-10">
            <FileText className="w-5 h-5 text-teal-500" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Gestão do Projeto</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1 ml-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status do Projeto</label>
                {role === 'ADMIN' && (
                  <button type="button" onClick={() => setModalConfig({isOpen: true, category: 'TENANT_STATUS', title: 'Status do Projeto', description: 'Fases e status com cores associadas', hasColor: true})} className="flex items-center gap-1 text-[10px] font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-md transition-colors">
                    <Settings className="w-3 h-3" /> Configurar
                  </button>
                )}
              </div>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300"
              >
                {systemOptions.filter((o: any) => o.category === 'TENANT_STATUS').map((o: any) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}

              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Consultor Responsável</label>
              <select 
                value={consultantId}
                onChange={(e) => setConsultantId(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300"
              >
                <option value="">Ninguém (Sem Consultor)</option>
                {consultores.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1 ml-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sistema Contábil Principal</label>
                {role === 'ADMIN' && (
                  <button type="button" onClick={() => setModalConfig({isOpen: true, category: 'ACCOUNTING_SYSTEM', title: 'Sistema Contábil Principal', description: 'Sistemas disponíveis no cadastro', hasColor: false})} className="flex items-center gap-1 text-[10px] font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-md transition-colors">
                    <Settings className="w-3 h-3" /> Configurar
                  </button>
                )}
              </div>
              <select 
                value={accountingSystem}
                onChange={(e) => setAccountingSystem(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300"
              >
                <option value="">Selecione...</option>
                {systemOptions.filter((o: any) => o.category === 'ACCOUNTING_SYSTEM').map((o: any) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}

              </select>
            </div>
          </div>

          <div className="space-y-2 relative z-10 mt-6">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Observações Gerais</label>
            <textarea 
              rows={4}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300 resize-none"
              placeholder="Anotações importantes sobre o momento do escritório, desafios iniciais ou detalhes do contrato."
            />
          </div>
        </motion.div>

        <div className="pt-6 flex justify-end">
          <button 
            type="submit"
            disabled={saving}
            className="bg-teal-600 text-white px-10 py-4 rounded-2xl hover:bg-teal-700 transition-all font-bold text-sm flex items-center gap-2 shadow-xl shadow-teal-600/20 disabled:opacity-50"
          >
            {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Salvando...</> : 'Salvar e Avançar para Frentes'}
          </button>
        </div>
      </form>
    </div>
  );
}
