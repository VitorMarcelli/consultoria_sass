'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Users, FileSpreadsheet, Timer, Loader2 } from 'lucide-react';
import { apiRequest } from '@/utils/api';

export default function RelatoriosPage() {
  const [loadingExport, setLoadingExport] = useState<string | null>(null);

  const handleExportClients = async () => {
    try {
      setLoadingExport('clients');
      const clients = await apiRequest('/clients');

      if (!clients || clients.length === 0) {
        alert('Nenhum cliente encontrado para exportação.');
        return;
      }

      // Prepare CSV data
      const headers = ['ID', 'Razão Social', 'CNPJ', 'Status', 'Regime Tributário', 'Data de Cadastro'];
      const rows = clients.map((c: any) => [
        c.id,
        `"${c.name}"`, // Quote strings to avoid issues with commas
        c.cnpj || 'N/A',
        c.status,
        c.taxRegime || 'N/A',
        new Date(c.createdAt).toLocaleDateString('pt-BR')
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((r: any[]) => r.join(','))
      ].join('\n');

      downloadCSV(csvContent, 'relatorio_clientes');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao exportar relatório de clientes. Verifique sua conexão.');
    } finally {
      setLoadingExport(null);
    }
  };

  const handleExportDeliveries = async () => {
    try {
      setLoadingExport('deliveries');
      const deliveries = await apiRequest('/deliveries');

      if (!deliveries || deliveries.length === 0) {
        alert('Nenhuma entrega encontrada para exportação.');
        return;
      }

      const headers = ['Competência', 'Cliente', 'Nome Padronizado', 'Área', 'Status', 'Responsável', 'Líder', 'Vencimento', 'Prazo Interno', 'Data Prevista', 'Data de Entrega'];
      const rows = deliveries.map((d: any) => [
        d.competence,
        `"${d.client?.name || 'Sem Cliente'}"`,
        `"${d.standardizedName}"`,
        d.front?.name || 'N/A',
        d.status,
        `"${d.responsible?.name || 'N/A'}"`,
        `"${d.leader?.name || 'N/A'}"`,
        d.legalDeadline ? new Date(d.legalDeadline).toLocaleDateString('pt-BR') : 'N/A',
        d.internalDeadline ? new Date(d.internalDeadline).toLocaleDateString('pt-BR') : 'N/A',
        d.executionDeadline ? new Date(d.executionDeadline).toLocaleDateString('pt-BR') : 'N/A',
        d.completedAt ? new Date(d.completedAt).toLocaleDateString('pt-BR') : 'N/A'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((r: any[]) => r.join(','))
      ].join('\n');

      downloadCSV(csvContent, 'relatorio_entregas');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao exportar relatório de entregas. Verifique sua conexão.');
    } finally {
      setLoadingExport(null);
    }
  };

  const handleExportTimes = async () => {
    try {
      setLoadingExport('times');
      const deliveries = await apiRequest('/deliveries');

      if (!deliveries || deliveries.length === 0) {
        alert('Nenhuma entrega encontrada para análise de tempos.');
        return;
      }

      const headers = ['Competência', 'Cliente', 'Entrega', 'Área', 'Responsável', 'Tempo Previsto Atual (min)', 'Última Revisão'];
      const rows = deliveries.map((d: any) => {
        // Encontra o tempo previsto atual (da última revisão)
        const sortedReviews = d.timeReviews?.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const latestReview = sortedReviews?.[0];

        return [
          d.competence,
          `"${d.client?.name || 'Sem Cliente'}"`,
          `"${d.standardizedName}"`,
          d.front?.name || 'N/A',
          `"${d.responsible?.name || 'N/A'}"`,
          latestReview?.newEstimatedTime || 'N/A',
          latestReview?.createdAt ? new Date(latestReview.createdAt).toLocaleDateString('pt-BR') : 'N/A'
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map((r: any[]) => r.join(','))
      ].join('\n');

      downloadCSV(csvContent, 'relatorio_tempos');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao exportar relatório de tempos. Verifique sua conexão.');
    } finally {
      setLoadingExport(null);
    }
  };

  const downloadCSV = (csvContent: string, fileName: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 25 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Relatórios & Exportações</h1>
          <p className="text-sm font-medium text-slate-500 mt-2 max-w-2xl">
            Extraia dados da sua operação em formato CSV para manipular em planilhas ou realizar análises cruzadas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Relatório de Carteira de Clientes */}
        <motion.div variants={cardVariants} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col h-full">
          <div className="h-12 w-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 mb-6">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Carteira de Clientes</h2>
          <p className="text-sm text-slate-500 mb-6 flex-1">
            Extraia a relação completa de clientes ativos e inativos, contendo CNPJ, status, regime e data de cadastro.
          </p>
          <button
            onClick={handleExportClients}
            disabled={loadingExport !== null}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-70"
          >
            {loadingExport === 'clients' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exportar CSV
          </button>
        </motion.div>

        {/* Relatório de Entregas */}
        <motion.div variants={cardVariants} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col h-full">
          <div className="h-12 w-12 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-600 mb-6">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Painel de Entregas</h2>
          <p className="text-sm text-slate-500 mb-6 flex-1">
            Relação completa de entregas do mês por responsável e área, incluindo status de andamento.
          </p>
          <button
            onClick={handleExportDeliveries}
            disabled={loadingExport !== null}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-70"
          >
            {loadingExport === 'deliveries' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exportar CSV
          </button>
        </motion.div>

        {/* Relatório de Tempos e Esforço */}
        <motion.div variants={cardVariants} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col h-full">
          <div className="h-12 w-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-6">
            <Timer className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Tempos Estimados</h2>
          <p className="text-sm text-slate-500 mb-6 flex-1">
            Análise de esforço operacional por cliente e por colaborador baseada nos tempos previstos atuais.
          </p>
          <button
            onClick={handleExportTimes}
            disabled={loadingExport !== null}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-70"
          >
            {loadingExport === 'times' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exportar CSV
          </button>
        </motion.div>

      </div>
    </motion.div>
  );
}
