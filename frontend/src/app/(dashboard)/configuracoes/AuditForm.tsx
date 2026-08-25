'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Building2,
  CheckCircle2,
  Circle,
  X,
} from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { Portal } from '@/components/ui/Portal';

const tableVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

const PAGE_SIZE = 25;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Detalhe do erro (stack trace) — inline aqui em vez de um novo componente
// em components/ui, já que é usado só nesta tela.
function ErrorDetailModal({ log, onClose }: { log: any; onClose: () => void }) {
  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-white/20 dark:border-slate-800 flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {log.method} {log.path}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                  {formatDateTime(log.createdAt)} · Status {log.statusCode ?? '—'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 -m-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Usuário</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {log.userName || 'Desconhecido'} {log.userEmail ? `(${log.userEmail})` : ''}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Escritório</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {log.tenantName || 'Não identificado'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Mensagem</p>
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{log.errorMessage}</p>
              </div>
              {log.stackTrace && (
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Stack trace</p>
                  <pre className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap break-words font-mono text-slate-600 dark:text-slate-400">
                    {log.stackTrace}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}

export default function AuditForm() {
  const [level, setLevel] = useState<'ERROR' | 'INFO'>('ERROR');
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<any>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiRequest(`/system-logs?level=${level}&page=${page}&pageSize=${PAGE_SIZE}`)
      .then((data) => {
        if (cancelled) return;
        setLogs(data?.items || []);
        setTotal(data?.total || 0);
      })
      .catch((err) => console.error('Erro ao buscar auditoria:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [level, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggleLevel = (next: 'ERROR' | 'INFO') => {
    setLevel(next);
    setPage(1);
  };

  const toggleResolved = async (log: any) => {
    setResolvingId(log.id);
    try {
      const updated = await apiRequest(`/system-logs/${log.id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ resolved: !log.resolved }),
      });
      setLogs((prev) => prev.map((l) => (l.id === log.id ? { ...l, ...updated } : l)));
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar status.');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="rounded-container border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8 sm:p-10 transition-colors">
        <div className="mb-8 flex items-center gap-4">
          <div className="p-3 rounded-inner bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Auditoria</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              Erros e atividades de todos os escritórios do sistema — visível só pra administradores.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1 mb-6">
          <button
            onClick={() => toggleLevel('ERROR')}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
              level === 'ERROR'
                ? 'bg-slate-900 dark:bg-teal-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Erros
          </button>
          <button
            onClick={() => toggleLevel('INFO')}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
              level === 'INFO'
                ? 'bg-slate-900 dark:bg-teal-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Atividades
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-slate-400 uppercase tracking-widest bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-bold">Usuário</th>
                <th className="px-6 py-4 font-bold">Escritório</th>
                <th className="px-6 py-4 font-bold">{level === 'ERROR' ? 'Rota' : 'Ação'}</th>
                <th className="px-6 py-4 font-bold">Quando</th>
                {level === 'ERROR' && <th className="px-6 py-4 font-bold">Status</th>}
              </tr>
            </thead>
            {loading ? (
              <tbody>
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <Loader2 className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-bold text-sm">Carregando registros...</p>
                  </td>
                </tr>
              </tbody>
            ) : logs.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-lg mb-1">
                      {level === 'ERROR' ? 'Nenhum erro registrado' : 'Nenhuma atividade registrada'}
                    </p>
                    <p className="text-sm font-medium text-slate-400">Os registros aparecem aqui conforme acontecem.</p>
                  </td>
                </tr>
              </tbody>
            ) : (
              <motion.tbody
                variants={tableVariants}
                initial="hidden"
                animate="show"
                className="divide-y divide-slate-100 dark:divide-slate-800"
              >
                <AnimatePresence>
                  {logs.map((log) => (
                    <motion.tr
                      key={log.id}
                      variants={rowVariants}
                      onClick={() => level === 'ERROR' && setSelectedError(log)}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        level === 'ERROR' ? 'cursor-pointer' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-teal-100 to-indigo-100 dark:from-teal-500/20 dark:to-indigo-500/20 flex items-center justify-center text-teal-700 dark:text-teal-400 font-black border border-teal-200/50 dark:border-teal-500/20 shrink-0">
                            {log.userName?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {log.userName || 'Desconhecido'}
                            </p>
                            {log.userEmail && (
                              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {log.userEmail}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-semibold text-xs">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {log.tenantName || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                        {level === 'ERROR' ? (
                          <span className="font-mono">
                            {log.method} {log.path}
                          </span>
                        ) : (
                          log.action || (
                            <span className="font-mono text-slate-400">
                              {log.method} {log.path}
                            </span>
                          )
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-xs whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      {level === 'ERROR' && (
                        <td className="px-6 py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleResolved(log);
                            }}
                            disabled={resolvingId === log.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors ${
                              log.resolved
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                            }`}
                          >
                            {resolvingId === log.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : log.resolved ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Circle className="w-3 h-3" />
                            )}
                            {log.resolved ? 'Resolvido' : 'Pendente'}
                          </button>
                        </td>
                      )}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </motion.tbody>
            )}
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-xs font-semibold text-slate-400">
              Página {page} de {totalPages} · {total} registro{total === 1 ? '' : 's'}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedError && <ErrorDetailModal log={selectedError} onClose={() => setSelectedError(null)} />}
    </div>
  );
}
