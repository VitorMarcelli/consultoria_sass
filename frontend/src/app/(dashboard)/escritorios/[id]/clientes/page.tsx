'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Plus, Trash2, Search, Edit2, Loader2, AlertCircle, UsersRound, Building2 } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import ClientModal from '@/components/ClientModal';
import CsvImportModal from '@/components/CsvImportModal';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

const tableVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export default function CadastroClientesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();

  const [clientes, setClientes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadClients();
  }, [id]);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest(`/clients?tenantId=${id}`);
      setClientes(data || []);
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClient = async (clientData: any) => {
    setIsSaving(true);
    try {
      if (editingClient) {
        // Edit
        await apiRequest(`/clients/${editingClient.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ tenantId: id, ...clientData }),
        });
      } else {
        // Create
        await apiRequest(`/clients`, {
          method: 'POST',
          body: JSON.stringify({ tenantId: id, ...clientData }),
        });
      }
      setIsClientModalOpen(false);
      setEditingClient(null);
      await loadClients();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar cliente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente? Essa ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      await apiRequest(`/clients/${clientId}?tenantId=${id}`, {
        method: 'DELETE',
      });
      setClientes(prev => prev.filter(c => c.id !== clientId));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir cliente');
    }
  };

  const handleImportCsv = async (file: File) => {
    setIsSaving(true);
    try {
      let lines: any[] = [];

      if (file.name.endsWith('.xlsx')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Retorna array de objetos com as chaves sendo o nome das colunas
        lines = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        if (lines.length === 0) {
          throw new Error('A planilha parece estar vazia ou conter apenas o cabeçalho.');
        }
      } else {
        const text = await file.text();
        const workbook = XLSX.read(text, { type: 'string' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        lines = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (lines.length === 0) {
          throw new Error('O arquivo CSV parece estar vazio ou conter apenas o cabeçalho.');
        }
      }

      const clientsPayload = lines.map((row: any) => {
        // Função auxiliar para achar o valor por nomes possíveis de coluna
        const getVal = (keys: string[]) => {
          const foundKey = Object.keys(row).find(k => 
            keys.some(expected => k.toLowerCase().trim() === expected.toLowerCase().trim())
          );
          const val = foundKey ? row[foundKey] : undefined;
          return (val === undefined || val === null) ? '' : String(val).trim();
        };

        const c = getVal;
        const b = (keys: string[]) => c(keys).toUpperCase() === 'SIM';
        const n = (keys: string[]) => {
          const val = c(keys);
          return val ? Number(val.replace(/[^0-9.-]+/g,"")) : undefined;
        };

        const mapRegime: Record<string, string> = { 'Simples Nacional': 'SIMPLES_NACIONAL', 'Lucro Presumido': 'LUCRO_PRESUMIDO', 'Lucro Real': 'LUCRO_REAL' };
        const mapStatus: Record<string, string> = { 'Ativo': 'ACTIVE', 'Inativo': 'INACTIVE' };
        const mapVolume: Record<string, string> = { 'Até 50': 'ATE_50', '51 a 200': '51_200', '201 a 500': '201_500', 'Mais de 500': 'MAIS_500' };
        const mapAuto: Record<string, string> = { 'Manual': 'MANUAL', 'Parcial': 'PARCIAL', 'Automatizada': 'AUTOMATIZADA' };
        const mapSystem: Record<string, string> = { 'Domínio': 'DOMINIO', 'Alterdata': 'ALTERDATA', 'Nasajon': 'NASAJON', 'Outro': 'OUTRO' };
        const mapPlatform: Record<string, string> = { 'Sieg': 'SIEG', 'Arquivei': 'ARQUIVEI', 'Outro': 'OUTRO' };
        const mapPoint: Record<string, string> = { 'Sistema/App': 'SISTEMA', 'Planilha': 'PLANILHA', 'Papel/Manual': 'MANUAL' };
        const mapProcType: Record<string, string> = { 'Normal': 'NORMAL', 'Complexo (Múltiplos sindicatos)': 'COMPLEXO' };
        const mapBookkeeping: Record<string, string> = { 'Caixa': 'CAIXA', 'Competência': 'COMPETENCIA' };
        const mapPeriod: Record<string, string> = { 'Mensal': 'MENSAL', 'Trimestral': 'TRIMESTRAL', 'Anual': 'ANUAL' };
        const mapInteg: Record<string, string> = { 'Sem Integração': 'NENHUMA', 'Parcial (Planilhas)': 'PARCIAL', 'Total (Sistemas via API)': 'TOTAL' };
        const mapLaunches: Record<string, string> = { 'Até 100': 'ATE_100', '101 a 500': '101_500', 'Mais de 500': 'MAIS_500' };
        
        const m = (val: string, dict: Record<string, string>) => val ? (dict[val] || val) : '';

        // Geral
        const name = c(['Razão Social', 'razaoSocial', 'name', 'Nome', 'Cliente']);
        const tradeName = c(['Nome Fantasia', 'nomeFantasia', 'tradeName', 'Fantasia']);
        const cnpj = c(['CNPJ', 'cnpj']);
        const city = c(['Cidade', 'city']);
        const state = c(['UF', 'Estado', 'state']);
        const taxRegime = m(c(['Regime Tributário', 'Regime Tributario', 'taxRegime']), mapRegime);
        const segment = c(['Segmento', 'segment']);
        const revenueBracket = c(['Faixa de Faturamento', 'revenueBracket']);
        const hasEconomicGroup = !!c(['Possui Grupo Econômico', 'Possui Grupo Economico', 'hasEconomicGroup']);
        const economicGroupName = c(['Nome do Grupo Econômico', 'Nome do Grupo Economico', 'economicGroupName']);
        const monthlyFee = n(['Honorário Mensal', 'Honorario Mensal', 'monthlyFee']);
        const classification = c(['Classificação', 'Classificacao', 'classification']);
        const status = m(c(['Status', 'status']), mapStatus) || 'ACTIVE';
        const fiscal = b(['Fiscal']);
        const contabil = b(['Contábil', 'Contabil']);
        const dp = b(['DP', 'Departamento Pessoal']);
        const observations = c(['Observações', 'Observacoes', 'observations']);

        // Fiscal
        const fiscalLeaderName = c(['Líder Fiscal', 'Lider Fiscal', 'fiscalLeaderName']);
        const fiscalOp1Name = c(['Operador 1 Fiscal', 'fiscalOp1Name']);
        const fiscalOp2Name = c(['Operador 2 Fiscal', 'fiscalOp2Name']);
        const fiscalFrequency = c(['Frequência Fiscal', 'Frequencia Fiscal', 'fiscalFrequency']);
        const fiscalComplexity = n(['Complexidade Fiscal', 'fiscalComplexity']);
        const fiscalNotesVolume = m(c(['Volume de Notas (Mensal)', 'fiscalNotesVolume']), mapVolume);
        const fiscalOutNotesVolume = c(['Volume Notas Saída', 'Volume Notas Saida', 'fiscalOutNotesVolume']);
        const fiscalInNotesVolume = c(['Volume Notas Entrada', 'fiscalInNotesVolume']);
        const fiscalAutomationLevel = m(c(['Nível de Automação', 'Nivel de Automacao', 'fiscalAutomationLevel']), mapAuto);
        const fiscalHasSpecialRegime = !!c(['Possui Regime Especial', 'fiscalHasSpecialRegime']);
        const fiscalSpecialRegimeDesc = c(['Descrição do Regime Especial', 'Descricao do Regime Especial', 'fiscalSpecialRegimeDesc']);
        const fiscalInNfe = c(['Meios Recebimento NFe Entrada', 'fiscalInNfe']);
        const fiscalOutNfe = c(['Meios Recebimento NFe Saída', 'fiscalOutNfe']);
        const fiscalNfse = c(['Meios Recebimento NFSe', 'fiscalNfse']);
        const fiscalSendingChannels = c(['Canais de Envio (Impostos)', 'fiscalSendingChannels']);
        const fiscalSystem = m(c(['Sistema Fiscal', 'fiscalSystem']), mapSystem);
        const fiscalNotesPlatform = m(c(['Plataforma Busca de Notas', 'fiscalNotesPlatform']), mapPlatform);
        const fiscalMeetsDeadlines = c(['Cliente Cumpre Prazos', 'fiscalMeetsDeadlines']);
        const fiscalParticulars = c(['Particularidades Fiscais', 'fiscalParticulars']);

        // DP
        const dpLeaderName = c(['Líder DP', 'Lider DP', 'dpLeaderName']);
        const dpOp1Name = c(['Operador 1 DP', 'dpOp1Name']);
        const dpOp2Name = c(['Operador 2 DP', 'dpOp2Name']);
        const dpFrequency = c(['Frequência DP', 'Frequencia DP', 'dpFrequency']);
        const dpComplexity = n(['Complexidade DP', 'dpComplexity']);
        const dpEmployeesCount = n(['Qtd Vidas (Funcionários)', 'dpEmployeesCount']);
        const dpProlaboreCount = n(['Qtd Pró-Labore', 'dpProlaboreCount']);
        const dpDomesticsCount = n(['Qtd Domésticas', 'dpDomesticsCount']);
        const dpPointReceipt = m(c(['Recebimento de Ponto', 'dpPointReceipt']), mapPoint);
        const dpVariablesLaunch = c(['Lançamento Variáveis', 'Lancamento Variaveis', 'dpVariablesLaunch']);
        const dpProcessingType = m(c(['Tipo de Processamento', 'dpProcessingType']), mapProcType);
        const dpSheetSending = c(['Envio da Folha', 'dpSheetSending']);
        const dpFrequentAdmissions = b(['Admissões/Demissões Frequentes', 'dpFrequentAdmissions']);
        const dpParticulars = c(['Particularidades DP', 'dpParticulars']);

        // Contábil
        const contabilLeaderName = c(['Líder Contábil', 'Lider Contabil', 'contabilLeaderName']);
        const contabilOp1Name = c(['Operador 1 Contábil', 'Operador 1 Contabil', 'contabilOp1Name']);
        const contabilOp2Name = c(['Operador 2 Contábil', 'Operador 2 Contabil', 'contabilOp2Name']);
        const contabilFrequency = c(['Frequência Contábil', 'Frequencia Contabil', 'contabilFrequency']);
        const contabilComplexity = n(['Complexidade Contábil', 'Complexidade Contabil', 'contabilComplexity']);
        const contabilBookkeeping = m(c(['Regime Contábil', 'Regime Contabil', 'contabilBookkeeping']), mapBookkeeping);
        const contabilLastClosing = c(['Último Mês Fechado', 'Ultimo Mes Fechado', 'contabilLastClosing']);
        const contabilClosingPeriod = m(c(['Periodicidade Fechamento', 'contabilClosingPeriod']), mapPeriod);
        const contabilReceiptFreq = c(['Frequência de Recebimento Docs', 'Frequencia de Recebimento Docs', 'contabilReceiptFreq']);
        const contabilReceiptMethod = c(['Meio de Recebimento Docs', 'contabilReceiptMethod']);
        const contabilIntegration = m(c(['Integração/Automação', 'Integracao/Automacao', 'contabilIntegration']), mapInteg);
        const contabilTrialBalance = c(['Necessidade Balancete', 'contabilTrialBalance']);
        const contabilLaunches = m(c(['Volume de Lançamentos', 'Volume de Lancamentos', 'contabilLaunches']), mapLaunches);
        const contabilParticulars = c(['Particularidades Contábeis', 'Particularidades Contabeis', 'contabilParticulars']);
        
        return { 
          name, tradeName, cnpj, city, state, 
          taxRegime, segment, revenueBracket, hasEconomicGroup, 
          economicGroupName, monthlyFee, classification, status, observations,
          fiscal, contabil, dp,
          fiscalLeaderName, fiscalOp1Name, fiscalOp2Name, fiscalFrequency, fiscalComplexity, fiscalNotesVolume, fiscalOutNotesVolume, fiscalInNotesVolume, fiscalAutomationLevel, fiscalHasSpecialRegime, fiscalSpecialRegimeDesc, fiscalInNfe, fiscalOutNfe, fiscalNfse, fiscalSendingChannels, fiscalSystem, fiscalNotesPlatform, fiscalMeetsDeadlines, fiscalParticulars,
          dpLeaderName, dpOp1Name, dpOp2Name, dpFrequency, dpComplexity, dpEmployeesCount, dpProlaboreCount, dpDomesticsCount, dpPointReceipt, dpVariablesLaunch, dpProcessingType, dpSheetSending, dpFrequentAdmissions, dpParticulars,
          contabilLeaderName, contabilOp1Name, contabilOp2Name, contabilFrequency, contabilComplexity, contabilBookkeepingRegime: contabilBookkeeping, contabilLastClosing, contabilClosingPeriod, contabilInfoReceiptFreq: contabilReceiptFreq, contabilInfoReceiptMethod: contabilReceiptMethod, contabilIntegrationLevel: contabilIntegration, contabilTrialBalanceNeed: contabilTrialBalance, contabilLaunchesVolume: contabilLaunches, contabilParticulars
        };
      }).filter(c => c.name); // Filtrar linhas inválidas sem nome

      if (clientsPayload.length === 0) {
        throw new Error('Nenhum cliente válido encontrado no arquivo.');
      }

      const response = await apiRequest('/clients/bulk', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: id,
          clients: clientsPayload
        })
      });
      
      alert(`Importação concluída: ${response.imported || 0} registros processados.`);
      setIsImportModalOpen(false);
      await loadClients();
    } catch (err: any) {
      throw new Error(err.message || 'Falha ao ler arquivo');
    } finally {
      setIsSaving(false);
    }
  };

  const openNewClient = () => {
    setEditingClient(null);
    setIsClientModalOpen(true);
  };

  const openEditClient = (client: any) => {
    setEditingClient(client);
    setIsClientModalOpen(true);
  };

  const handleSaveAndNext = () => {
    router.push(`/escritorios/${id}/classificacao`);
  };

  const filteredClientes = clientes.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.cnpj?.includes(search)
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
          <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-500/30 shrink-0">
            <UsersRound className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Base de Clientes</h2>
            <p className="text-slate-500 font-medium mt-1">Gerencie as empresas e contas atendidas pelo escritório.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all font-bold text-sm shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Importar Planilha
          </button>
          <button 
            onClick={openNewClient}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl hover:bg-teal-600 transition-all font-bold text-sm shadow-xl hover:shadow-teal-600/30"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
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
              placeholder="Buscar cliente por nome ou CNPJ..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300 shadow-sm"
            />
          </div>
          <div className="text-sm font-bold text-slate-400 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            Total: <span className="text-slate-900">{filteredClientes.length}</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-slate-400 uppercase tracking-widest bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-8 py-5 font-bold">Razão Social</th>
                <th className="px-8 py-5 font-bold">CNPJ</th>
                <th className="px-8 py-5 font-bold">Regime Tributário</th>
                <th className="px-8 py-5 font-bold">Status</th>
                <th className="px-8 py-5 text-right font-bold w-32">Ações</th>
              </tr>
            </thead>
            {isLoading ? (
              <tbody>
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-500" />
                    <p className="font-bold text-sm">Carregando carteira de clientes...</p>
                  </td>
                </tr>
              </tbody>
            ) : filteredClientes.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-500">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
                      <Building2 className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="font-bold text-slate-700 text-lg mb-1">Nenhum cliente cadastrado</p>
                    <p className="text-sm font-medium text-slate-400 max-w-sm mx-auto">Tente buscar por outro termo ou cadastre as empresas usando o botão "Novo Cliente".</p>
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
                  {filteredClientes.map((cliente) => (
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
                          <span className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors">{cliente.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-slate-500 font-semibold">
                        {cliente.cnpj?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') || '-'}
                      </td>
                      <td className="px-8 py-5 text-slate-600 font-semibold">{formatRegime(cliente.taxRegime)}</td>
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
                          <button 
                            onClick={() => handleDelete(cliente.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-xl hover:bg-rose-50"
                            title="Excluir cliente"
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

      <div className="pt-2 flex justify-end">
        <button 
          onClick={handleSaveAndNext}
          className="bg-teal-600 text-white px-8 py-4 rounded-2xl hover:bg-teal-700 transition-all font-bold text-sm flex items-center gap-2 shadow-xl shadow-teal-600/20"
        >
          Avançar para Classificações
        </button>
      </div>

      <ClientModal 
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={handleSaveClient}
        initialData={editingClient}
        isLoading={isSaving}
      />

      <CsvImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportCsv}
        isLoading={isSaving}
      />
    </div>
  );
}
