'use client';

import React, { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Loader2, Building2, Plus, Upload, Trash2, Edit2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiRequest } from '@/utils/api';
import ClientModal from '@/components/ClientModal';
import MappingProgress from '@/components/catalog/MappingProgress';
import CsvImportModal from '@/components/CsvImportModal';
import Client360SlideOver from '@/components/Client360SlideOver';
import AllocateClientModal from './AllocateClientModal';
import ClientCycleModal from './ClientCycleModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
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
  const [importProgress, setImportProgress] = useState<{ current: number, total: number } | null>(null);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedClientFor360, setSelectedClientFor360] = useState<any>(null);
  const [is360Open, setIs360Open] = useState(false);

  const [clientToDelete, setClientToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteClient = (client: any) => {
    setClientToDelete(client);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      await apiRequest(`/clients/${clientToDelete.id}?tenantId=${id}`, { method: 'DELETE' });
      setClientToDelete(null);
      await loadClients();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir cliente');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImportCsv = async (file: File) => {
    setIsSaving(true);
    try {
      // Dois layouts de template são aceitos.
      //
      // O atual (Template_Carteira_Sevilha) é uma aba só: um cliente por linha
      // e as colunas de frente prefixadas ("Fiscal | Nota Volume"). Quem
      // desmonta o prefixo é o backend (imports/flat-template.ts) — daqui ele
      // sai como uma tabela qualquer.
      //
      // O anterior (MVP REV03) tinha 4 abas normalizadas: 01_Clientes como
      // base e 02_Fiscal/03_Contabil/04_Pessoal com uma linha por CNPJ/CPF
      // ativo naquela frente, casadas pelo documento. Continua aceito porque
      // há escritório com a carteira já preenchida nesse formato.
      //
      // Cada aba do arquivo real tem um título + subtítulo decorativos ANTES
      // do cabeçalho de verdade (linha 4, não linha 1) — sheet_to_json direto
      // pegaria o título como cabeçalho e leria tudo com chaves erradas
      // ("__EMPTY_1" etc). Em vez de assumir uma linha fixa (o que quebraria
      // se alguém inserir uma linha de nota acima), procura a linha que
      // contém "CNPJ/CPF" — presente literalmente com esse texto em TODAS as
      // 4 abas — e usa ela como cabeçalho.
      const sheetToJson = (workbook: XLSX.WorkBook, sheetName: string): any[] => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return [];

        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false }) as any[][];
        const headerRowIndex = rawRows.findIndex((row) =>
          row.some((cell) => typeof cell === 'string' && cell.toLowerCase().trim() === 'cnpj/cpf'),
        );
        // Não achou o cabeçalho esperado: aba fora do padrão do template —
        // trata como vazia em vez de devolver lixo com chaves "__EMPTY_N".
        if (headerRowIndex === -1) return [];

        const headers = rawRows[headerRowIndex];
        const docColIndex = headers.findIndex(
          (h) => typeof h === 'string' && h.toLowerCase().trim() === 'cnpj/cpf',
        );
        return rawRows
          .slice(headerRowIndex + 1)
          // Linhas "reservadas" da tabela do Excel (formatadas mas nunca
          // preenchidas) não têm CNPJ/CPF — descarta em vez de mandar
          // centenas de linhas vazias pro backend.
          .filter((row) => row[docColIndex] !== undefined && row[docColIndex] !== null && String(row[docColIndex]).trim() !== '')
          .map((row) => {
            const obj: Record<string, any> = {};
            headers.forEach((h, i) => {
              if (h !== undefined && h !== null && String(h).trim() !== '') {
                obj[String(h).trim()] = row[i] ?? null;
              }
            });
            return obj;
          });
      };

      let workbook: XLSX.WorkBook;
      if (file.name.endsWith('.xlsx')) {
        const buffer = await file.arrayBuffer();
        workbook = XLSX.read(buffer, { type: 'array' });
      } else {
        const text = await file.text();
        workbook = XLSX.read(text, { type: 'string' });
      }

      // CSV e template de coluna única caem no fallback da primeira aba; o
      // template de 4 abas usa as abas nomeadas.
      const clientesSheetName = workbook.SheetNames.includes('01_Clientes')
        ? '01_Clientes'
        : workbook.SheetNames[0];
      const lines = sheetToJson(workbook, clientesSheetName);
      const fiscalLines = sheetToJson(workbook, '02_Fiscal');
      const contabilLines = sheetToJson(workbook, '03_Contabil');
      const pessoalLines = sheetToJson(workbook, '04_Pessoal');

      if (lines.length === 0) {
        throw new Error('Arquivo vazio ou sem registros válidos');
      }

      const getDoc = (row: any): string | null => {
        const key = Object.keys(row).find((k) => ['cnpj/cpf', 'cnpj', 'cpf'].includes(k.toLowerCase().trim()));
        if (!key) return null;
        const raw = row[key];
        if (raw === null || raw === undefined) return null;
        const digits = String(raw).replace(/\D/g, '');
        return digits || null;
      };

      setImportProgress({ current: 0, total: lines.length });

      const CHUNK_SIZE = 500;
      let totalImported = 0;
      const allErrors: string[] = [];
      const allWarnings: string[] = [];

      for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
        const chunk = lines.slice(i, i + CHUNK_SIZE);
        // Só manda as linhas de frente cujo CNPJ/CPF está neste lote —
        // evita reenviar as abas inteiras a cada chunk de 500 clientes.
        const chunkDocs = new Set(chunk.map(getDoc).filter(Boolean));
        const filterByDoc = (rows: any[]) => rows.filter((r) => chunkDocs.has(getDoc(r)));

        const response = await apiRequest('/imports/clients-json', {
          method: 'POST',
          body: JSON.stringify({
            tenantId: id,
            cycleId: cycleId,
            data: chunk,
            fiscal: filterByDoc(fiscalLines),
            contabil: filterByDoc(contabilLines),
            pessoal: filterByDoc(pessoalLines),
            fileName: file.name,
            // +2: planilha é 1-based e a linha 1 é o cabeçalho, então a
            // primeira linha de dados (índice 0) é a linha 2 da planilha.
            startRow: i + 2
          })
        });

        totalImported += response.count || 0;
        if (response.errors?.length) allErrors.push(...response.errors);
        if (response.warnings?.length) allWarnings.push(...response.warnings);
        setImportProgress({ current: Math.min(i + CHUNK_SIZE, lines.length), total: lines.length });
      }

      // Um mesmo problema costuma repetir em dezenas de linhas — um
      // colaborador que não existe no cadastro aparece em cada cliente que ele
      // atende. Listar linha a linha enche o limite de 20 e esconde justamente
      // os outros problemas; agrupado, o mesmo relatório cabe em três linhas e
      // diz quantas vezes aconteceu.
      const agrupar = (mensagens: string[]) => {
        const grupos = new Map<string, { texto: string; linhas: string[] }>();
        for (const m of mensagens) {
          const chave = m.replace(/linha \d+/g, 'linha N');
          const linha = m.match(/linha (\d+)/)?.[1];
          const grupo = grupos.get(chave) ?? { texto: m, linhas: [] };
          if (linha) grupo.linhas.push(linha);
          grupos.set(chave, grupo);
        }
        return [...grupos.values()].map(({ texto, linhas }) =>
          linhas.length > 1
            ? `${texto.replace(/linha \d+/, `linhas ${linhas.slice(0, 5).join(', ')}${linhas.length > 5 ? ` e mais ${linhas.length - 5}` : ''}`)}`
            : texto,
        );
      };

      let summary = `Importação de ${totalImported} registros concluída.`;
      if (allErrors.length) {
        const erros = agrupar(allErrors);
        summary += `\n\n${allErrors.length} erro(s) de validação (linhas não importadas):\n${erros.slice(0, 15).join('\n\n')}`;
        if (erros.length > 15) summary += `\n... e mais ${erros.length - 15} tipo(s) de erro.`;
      }
      if (allWarnings.length) {
        const avisos = agrupar(allWarnings);
        summary += `\n\n${allWarnings.length} aviso(s):\n${avisos.slice(0, 15).join('\n\n')}`;
        if (avisos.length > 15) summary += `\n... e mais ${avisos.length - 15} tipo(s) de aviso.`;
      }
      alert(summary);
      setIsImportModalOpen(false);
      setImportProgress(null);
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

  // Sigla curta da frente. As tres conhecidas tem abreviacao fixa; nome
  // customizado do escritorio cai nas tres primeiras letras.
  const siglaFrente = (nome?: string) => {
    const n = (nome ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
    if (/fiscal|tributar|impost/.test(n)) return 'FIS';
    if (/contab|escritur|societ/.test(n)) return 'CTB';
    if (/pessoal|folha|trabalhista|rh/.test(n) || /\bdp\b/.test(n)) return 'DP';
    return (nome ?? '?').slice(0, 3).toUpperCase();
  };

  // A listagem deixa de exibir Ativo/Inativo do cliente e passa a exibir as
  // siglas das frentes em que ele ATUA (decisao do cliente, 09/09/2026).
  // "INATIVO" aparece so quando ele nao atua em nenhuma — que e a unica
  // situacao em que o cliente esta de fato fora da operacao.
  const frentesAtivasPorCliente = React.useMemo(() => {
    const mapa = new Map<string, string[]>();
    for (const linha of clientes) {
      if (linha.actsInFront !== 'YES') continue;
      const atual = mapa.get(linha.id) ?? [];
      const sigla = siglaFrente(linha.frontName);
      if (sigla && !atual.includes(sigla)) atual.push(sigla);
      mapa.set(linha.id, atual);
    }
    return mapa;
  }, [clientes]);

  const formatStatus = (clienteId: string) => {
    const frentes = frentesAtivasPorCliente.get(clienteId) ?? [];

    if (frentes.length === 0) {
      return (
        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ring-1 bg-rose-100 text-rose-700 ring-rose-500/20">
          Inativo
        </span>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        {frentes.map((sigla) => (
          <span
            key={sigla}
            className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ring-1 bg-teal-100 text-teal-700 ring-teal-500/20"
          >
            {sigla}
          </span>
        ))}
      </div>
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
          <a
            href="/02_Dicionario_e_Template_Unico_Carteira_MVP_REV03.xlsx"
            download
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all font-bold text-sm shadow-sm"
            title="Baixar o modelo de planilha usado na importação"
          >
            <Download className="w-4 h-4" />
            Baixar Modelo
          </a>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8"
      >
        {/* Progresso do mapeamento: sem ele, o consultor vê uma sequência de
            "não avaliado" e não sabe dimensionar o que falta. */}
        <div className="p-6 pb-0">
          <MappingProgress tenantId={id} frontId={frontId || undefined} refreshKey={clientes} />
        </div>
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
                <th className="px-8 py-5 font-bold">Frentes Ativas</th>
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
                        {formatStatus(cliente.id)}
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
                            onClick={() => handleDeleteClient(cliente)}
                            className="p-2 text-slate-400 hover:text-rose-600 transition-colors rounded-xl hover:bg-rose-50"
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
        onClose={() => { setIsImportModalOpen(false); setImportProgress(null); }}
        onImport={handleImportCsv}
        isLoading={isSaving}
        progressValue={importProgress ? Math.round((importProgress.current / importProgress.total) * 100) : undefined}
        progressText={importProgress ? `Importando ${importProgress.current} de ${importProgress.total} clientes...` : undefined}
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

      <ConfirmModal
        isOpen={!!clientToDelete}
        onClose={() => setClientToDelete(null)}
        onConfirm={confirmDeleteClient}
        variant="danger"
        title="Excluir cliente"
        description={`Tem certeza que deseja excluir "${clientToDelete?.name}"? O cliente será marcado como inativo e sairá da carteira ativa, mas o histórico dele é preservado.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        isLoading={isDeleting}
      />
    </div>
  );
}
