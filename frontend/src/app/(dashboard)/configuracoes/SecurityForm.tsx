'use client';

import { useState, useEffect } from 'react';
import { Loader2, KeyRound, ShieldCheck, Smartphone, CheckCircle2, ShieldAlert } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function SecurityForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Connected Devices State
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const supabase = createClient();

  const getDeviceSessionId = () => {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.match(/(^|;)\s*device_session_id=([^;]+)/);
    return match ? match[2] : '';
  };

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${apiUrl}/auth/sessions`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'X-Device-Session-Id': getDeviceSessionId(),
          },
        });

        if (res.ok) {
          const data = await res.json();
          setSessions(data);
        }
      } catch (err) {
        console.error('Erro ao buscar sessões:', err);
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchSessions();
  }, [supabase.auth]);

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'X-Device-Session-Id': getDeviceSessionId(),
        },
      });

      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, isActive: false, status: 'REVOKED' } : s))
        );
      }
    } catch (err) {
      console.error('Erro ao desconectar sessão:', err);
    } finally {
      setRevokingId(null);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Alterar Senha Section */}
      <div className="rounded-container border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8 sm:p-10 transition-colors">
        <div className="mb-8 flex items-center gap-4">
          <div className="p-3 rounded-inner bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Alterar Senha</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              Atualize a senha usada para acessar sua conta.
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm font-semibold text-rose-600 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm font-semibold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Senha atualizada com sucesso!
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-bold text-slate-700 dark:text-slate-300 block">Nova Senha</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-inner border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-4 py-3.5 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-teal-500 dark:focus:border-teal-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-teal-500/10 placeholder-slate-400 dark:placeholder-slate-500"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-bold text-slate-700 dark:text-slate-300 block">Confirmar Nova Senha</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-inner border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-4 py-3.5 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-teal-500 dark:focus:border-teal-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-teal-500/10 placeholder-slate-400 dark:placeholder-slate-500"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="rounded-inner bg-teal-600 px-8 py-3.5 text-sm font-bold text-white hover:bg-teal-700 shadow-lg shadow-teal-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Atualizando...' : 'Atualizar Senha'}
            </button>
          </div>
        </form>
      </div>

      {/* 2FA Section (Visual Only) */}
      <div className="rounded-container border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8 sm:p-10 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-inner bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0 mt-1">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Autenticação em Duas Etapas (2FA)</h3>
                <span className="text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 text-amber-700 dark:text-amber-500 px-2 py-0.5 rounded-md">Em Breve</span>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 max-w-xl leading-relaxed">
                Adicione uma camada extra de segurança exigindo um código verificador ao fazer login na sua conta.
              </p>
            </div>
          </div>
          
          <button
            type="button"
            disabled
            className="relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-slate-200 opacity-50 transition-colors duration-200 ease-in-out focus:outline-none"
            role="switch"
            aria-checked={false}
          >
            <span className="sr-only">Habilitar 2FA</span>
            <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-0" />
          </button>
        </div>
      </div>

      {/* Connected Devices (Real-time Management) */}
      <div className="rounded-container border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8 sm:p-10 transition-colors">
        <div className="mb-8 flex items-center gap-4">
          <div className="p-3 rounded-inner bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Dispositivos Conectados</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              Gerencie e desconecte as sessões ativas nos seus dispositivos. Acesso simultâneo limitado por token de uso.
            </p>
          </div>
        </div>

        {loadingSessions ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600 dark:text-teal-400" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-inner border border-teal-200 dark:border-teal-800/50 bg-teal-50/20 dark:bg-teal-950/20">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Sessão Web (Dispositivo Atual)
                  <span className="text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-500 px-1.5 py-0.5 rounded">Sessão Atual</span>
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                  São Paulo, BR • Último acesso: Agora
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-inner border transition-all ${
                  session.isCurrentSession
                    ? 'border-teal-200 dark:border-teal-800/50 bg-teal-50/20 dark:bg-teal-950/20'
                    : !session.isActive
                    ? 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 opacity-70'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                    {session.deviceFamily} - {session.browser}
                    {session.isCurrentSession ? (
                      <span className="text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-500 px-1.5 py-0.5 rounded">Sessão Atual</span>
                    ) : !session.isActive ? (
                      <span className="text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                        {session.status === 'SUPERSEDED' ? 'Desconectado (Substituído)' : 'Desconectado'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20 text-blue-700 dark:text-blue-500 px-1.5 py-0.5 rounded">Ativo</span>
                    )}
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                    {session.location || 'Localização Indisponível'} • {session.ipAddress} • Último acesso:{' '}
                    {new Date(session.lastActive).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {!session.isCurrentSession && session.isActive && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(session.id)}
                    disabled={revokingId === session.id}
                    className="text-sm font-bold text-rose-600 dark:text-rose-400 px-4 py-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed self-end sm:self-center"
                  >
                    {revokingId === session.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {revokingId === session.id ? 'Desconectando...' : 'Desconectar'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
