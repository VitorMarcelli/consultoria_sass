'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, CheckCircle2, User, Mail, ShieldAlert } from 'lucide-react';
import { apiRequest } from '@/utils/api';

export default function ProfileForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const me = await apiRequest('/users/me');
        setFormData({
          name: me.name || '',
          email: me.email || '',
          role: me.role || '',
        });
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados do usuário.');
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await apiRequest('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: formData.name }),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md text-xs font-bold">Administrador</span>;
      case 'LEADER':
        return <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md text-xs font-bold">Líder</span>;
      case 'CONSULTANT':
        return <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-xs font-bold">Consultor</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md text-xs font-bold">{role}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white shadow-sm p-8 sm:p-10 animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <User className="h-6 w-6 text-teal-600" />
          Dados Pessoais
        </h2>
        <p className="text-sm font-medium text-slate-500 mt-2">
          Atualize suas informações de perfil e como seu nome é exibido no sistema.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm font-semibold text-rose-600 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm font-semibold text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Perfil atualizado com sucesso!
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Nome Completo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 p-3.5 text-sm font-medium text-slate-900 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                placeholder="Seu nome completo"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>E-mail Corporativo</span>
              <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase">Somente Leitura</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                disabled
                value={formData.email}
                className="block w-full rounded-xl border border-slate-200 bg-slate-100/50 pl-10 p-3.5 text-sm font-medium text-slate-500 cursor-not-allowed outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Permissão Atual
            </label>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
              {getRoleBadge(formData.role)}
              <span className="text-xs font-medium text-slate-500">
                Para alterar seu nível de acesso, contate um Administrador do sistema.
              </span>
            </div>
          </div>
        </div>

        <div className="pt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-teal-600 px-8 py-3.5 text-sm font-bold text-white hover:bg-teal-700 shadow-lg shadow-teal-600/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
