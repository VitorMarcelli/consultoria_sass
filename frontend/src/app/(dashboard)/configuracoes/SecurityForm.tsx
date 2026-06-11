'use client';

import { useState } from 'react';
import { Loader2, KeyRound, ShieldCheck, Smartphone, CheckCircle2, ShieldAlert } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function SecurityForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const supabase = createClient();

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
      <div className="rounded-[2rem] border border-slate-100 bg-white shadow-sm p-8 sm:p-10">
        <div className="mb-8 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-teal-50 text-teal-600">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Alterar Senha</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">
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
            <label htmlFor="new-password" className="text-sm font-bold text-slate-700 block">Nova Senha</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-bold text-slate-700 block">Confirmar Nova Senha</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="rounded-xl bg-teal-600 px-8 py-3.5 text-sm font-bold text-white hover:bg-teal-700 shadow-lg shadow-teal-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Atualizando...' : 'Atualizar Senha'}
            </button>
          </div>
        </form>
      </div>

      {/* 2FA Section (Visual Only) */}
      <div className="rounded-[2rem] border border-slate-100 bg-white shadow-sm p-8 sm:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-teal-50 text-teal-600 shrink-0 mt-1">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Autenticação em Duas Etapas (2FA)</h3>
                <span className="text-[10px] font-bold uppercase bg-amber-50 border border-amber-200/50 text-amber-700 px-2 py-0.5 rounded-md">Em Breve</span>
              </div>
              <p className="text-sm font-medium text-slate-500 mt-2 max-w-xl leading-relaxed">
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

      {/* Connected Devices (Visual Only) */}
      <div className="rounded-[2rem] border border-slate-100 bg-white shadow-sm p-8 sm:p-10">
        <div className="mb-8 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-teal-50 text-teal-600">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Dispositivos Conectados</h2>
              <span className="text-[10px] font-bold uppercase bg-amber-50 border border-amber-200/50 text-amber-700 px-2 py-0.5 rounded-md">Em Breve</span>
            </div>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Gerencie e desconecte as sessões ativas nos seus dispositivos.
            </p>
          </div>
        </div>

        <div className="space-y-3 opacity-60 pointer-events-none">
          {/* Sessão 1 (Atual) */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                MacBook Pro - Google Chrome
                <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Sessão Atual</span>
              </span>
              <span className="text-xs font-medium text-slate-500 mt-1">
                São Paulo, BR • Último acesso: Agora
              </span>
            </div>
          </div>
          
          {/* Sessão 2 */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900">iPhone 14 Pro - Safari</span>
              <span className="text-xs font-medium text-slate-500 mt-1">
                São Paulo, BR • Último acesso: Ontem às 14:30
              </span>
            </div>
            <button className="text-sm font-bold text-rose-600 px-3 py-1.5 hover:bg-rose-50 rounded-lg transition-colors">
              Desconectar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
