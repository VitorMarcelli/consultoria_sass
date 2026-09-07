'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, KeyRound, Mail, Minus, Plus, Check } from 'lucide-react';
import { apiRequest } from '@/utils/api';

const tableVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } }
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin Global',
  CONSULTANT: 'Consultor',
  LEADER: 'Líder',
  OPERATOR: 'Operador'
};

// Stepper em pill por linha — sem modal, sem confirmação: é um número só,
// clicar em +/- já salva. O "-" trava em 1 (espelha o @Min(1) do backend),
// então a UI nunca chega a tentar mandar um valor inválido.
function AccessStepper({
  userId,
  value,
  onSaved
}: {
  userId: string;
  value: number;
  onSaved: (userId: string, newValue: number) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const change = async (delta: number) => {
    const next = value + delta;
    if (next < 1 || saving) return;
    setSaving(true);
    try {
      await apiRequest(`/users/${userId}/access-limit`, {
        method: 'PATCH',
        body: JSON.stringify({ maxConcurrentSessions: next })
      });
      onSaved(userId, next);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1200);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar o limite de acessos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1">
      <button
        type="button"
        onClick={() => change(-1)}
        disabled={value <= 1 || saving}
        className="w-7 h-7 flex items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-teal-600 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Diminuir limite de acessos"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <div className="w-10 flex items-center justify-center">
        {saving ? (
          <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />
        ) : justSaved ? (
          <Check className="w-4 h-4 text-emerald-500" />
        ) : (
          <span className="text-sm font-black text-slate-800 dark:text-slate-100">{value}</span>
        )}
      </div>

      <button
        type="button"
        onClick={() => change(1)}
        disabled={saving}
        className="w-7 h-7 flex items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-teal-600 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Aumentar limite de acessos"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function AccessControlForm() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [limitEnforced, setLimitEnforced] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await apiRequest('/users');
        setUsers(data || []);
      } catch (err) {
        console.error('Erro ao buscar usuários:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();

    // O valor por usuário continua editável e é gravado normalmente; o que
    // pode estar desligado é a imposição da regra no backend.
    apiRequest('/users/me')
      .then((me) => setLimitEnforced(me?.sessionLimitEnforced !== false))
      .catch(() => setLimitEnforced(true));
  }, []);

  const handleSaved = (userId: string, newValue: number) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, maxConcurrentSessions: newValue } : u))
    );
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="rounded-container border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8 sm:p-10 transition-colors">
        <div className="mb-8 flex items-center gap-4">
          <div className="p-3 rounded-inner bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Controle de Acessos</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              Quantos dispositivos cada conta pode manter logados ao mesmo tempo. Acima do limite, um novo login é
              bloqueado — nenhuma sessão existente é desconectada automaticamente.
            </p>
          </div>
        </div>

        {!limitEnforced && (
          <div className="mb-6 rounded-inner border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-5 py-4">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
              O limite de acessos simultâneos está desativado
            </p>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400/80 mt-1">
              Os valores abaixo continuam sendo salvos, mas nenhum login está sendo bloqueado. Para voltar a aplicar a
              regra, defina <code className="font-mono text-xs">AUTH_SESSION_LIMIT_ENABLED=true</code> no ambiente do
              backend.
            </p>
          </div>
        )}

        <div className="relative w-full max-w-md mb-6">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar usuário por nome ou e-mail..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-slate-400 uppercase tracking-widest bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-bold">Usuário</th>
                <th className="px-6 py-4 font-bold">Cargo</th>
                <th className="px-6 py-4 font-bold">Acessos Simultâneos</th>
              </tr>
            </thead>
            {loading ? (
              <tbody>
                <tr>
                  <td colSpan={3} className="px-6 py-20 text-center">
                    <Loader2 className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-bold text-sm">Carregando usuários...</p>
                  </td>
                </tr>
              </tbody>
            ) : filteredUsers.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={3} className="px-6 py-20 text-center">
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-lg mb-1">Nenhum usuário encontrado</p>
                    <p className="text-sm font-medium text-slate-400">Verifique o termo buscado.</p>
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
                  {filteredUsers.map((u) => (
                    <motion.tr key={u.id} variants={rowVariants} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-teal-100 to-indigo-100 dark:from-teal-500/20 dark:to-indigo-500/20 flex items-center justify-center text-teal-700 dark:text-teal-400 font-black border border-teal-200/50 dark:border-teal-500/20 shrink-0">
                            {u.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {u.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-semibold text-xs">
                        {ROLE_LABELS[u.role] || u.role}
                      </td>
                      <td className="px-6 py-4">
                        <AccessStepper
                          userId={u.id}
                          value={u.maxConcurrentSessions ?? 1}
                          onSaved={handleSaved}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </motion.tbody>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
