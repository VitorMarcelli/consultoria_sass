'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, CheckCircle2, Bell, Mail, MonitorSmartphone, CalendarDays, ShieldAlert } from 'lucide-react';
import { apiRequest } from '@/utils/api';

export default function NotificationPreferencesForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prefs, setPrefs] = useState({
    inAppAlerts: true,
    emailAlerts: true,
    dailyDigest: false,
  });

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const data = await apiRequest('/notifications/preferences');
        if (data) {
          setPrefs({
            inAppAlerts: data.inAppAlerts,
            emailAlerts: data.emailAlerts,
            dailyDigest: data.dailyDigest,
          });
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar preferências.');
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await apiRequest('/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(prefs),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar as preferências.');
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ 
    label, 
    description, 
    icon: Icon, 
    checked, 
    onChange, 
    disabled = false 
  }: { 
    label: string, 
    description: string, 
    icon: any, 
    checked: boolean, 
    onChange: (val: boolean) => void,
    disabled?: boolean
  }) => (
    <div className={`flex items-start justify-between gap-4 p-4 rounded-xl border ${checked ? 'border-teal-200 bg-teal-50/50' : 'border-slate-100 bg-white hover:border-slate-200'} transition-all`}>
      <div className="flex gap-4">
        <div className={`mt-0.5 p-2.5 rounded-xl ${checked ? 'bg-teal-100 text-teal-600' : 'bg-slate-50 text-slate-500 border border-slate-200/60'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <label htmlFor={`toggle-${label.replace(/\s+/g, '-').toLowerCase()}`} className={`text-sm font-bold tracking-wide cursor-pointer ${checked ? 'text-teal-900' : 'text-slate-900'}`}>{label}</label>
            {disabled && (
              <span className="text-[10px] font-bold uppercase bg-amber-50 border border-amber-200/50 text-amber-700 px-2 py-0.5 rounded-md">Em Breve</span>
            )}
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <button
        id={`toggle-${label.replace(/\s+/g, '-').toLowerCase()}`}
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-teal-600 shadow-inner' : 'bg-slate-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        role="switch"
        aria-checked={checked}
      >
        <span className="sr-only">Usar {label}</span>
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white shadow-sm p-8 sm:p-10 animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Bell className="h-6 w-6 text-teal-600" />
          Preferências de Notificações
        </h2>
        <p className="text-sm font-medium text-slate-500 mt-2">
          Escolha como e quando você deseja ser avisado sobre o que acontece nos projetos.
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
            Preferências salvas com sucesso!
          </div>
        )}

        <div className="space-y-3">
          <Toggle 
            label="Notificações In-App" 
            description="Receba alertas no sino do cabeçalho enquanto usa o sistema."
            icon={MonitorSmartphone}
            checked={prefs.inAppAlerts}
            onChange={(val) => setPrefs(prev => ({ ...prev, inAppAlerts: val }))}
          />

          <Toggle 
            label="Alertas por E-mail" 
            description="Receba um e-mail imediato para notificações urgentes (atribuições e prazos)."
            icon={Mail}
            checked={prefs.emailAlerts}
            onChange={(val) => setPrefs(prev => ({ ...prev, emailAlerts: val }))}
            disabled={true}
          />

          <Toggle 
            label="Resumo Diário (Digest)" 
            description="Receba um único e-mail diário com o resumo do que aconteceu nos seus clientes."
            icon={CalendarDays}
            checked={prefs.dailyDigest}
            onChange={(val) => setPrefs(prev => ({ ...prev, dailyDigest: val }))}
            disabled={true}
          />
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
            {saving ? 'Salvando...' : 'Salvar Preferências'}
          </button>
        </div>
      </form>
    </div>
  );
}
