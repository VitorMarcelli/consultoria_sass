'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Users, 
  Shield, 
  Mail,
  Calendar,
  Loader2,
  AlertCircle,
  Award,
  ChevronRight
} from 'lucide-react';
import { apiRequest } from '@/utils/api';

interface Tenant {
  id: string;
  name: string;
  cnpj: string | null;
  slug: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'LEADER' | 'CONSULTANT';
  createdAt: string;
}

export default function EmpresaPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Role updating state
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const meData = await apiRequest('/users/me');
      setMe(meData);
      setTenant(meData.tenant);

      const membersData = await apiRequest('/users');
      setUsers(membersData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar dados da empresa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleChange = async (userId: string, newRole: 'ADMIN' | 'LEADER' | 'CONSULTANT') => {
    try {
      setUpdatingUserId(userId);
      await apiRequest(`/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      // Refresh list
      const membersData = await apiRequest('/users');
      setUsers(membersData);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar nível de acesso.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return {
          label: 'Administrador',
          color: 'bg-teal-50 text-teal-700 border-teal-200/50',
          dot: 'bg-teal-500'
        };
      case 'LEADER':
        return {
          label: 'Líder',
          color: 'bg-amber-50 text-amber-700 border-amber-200/50',
          dot: 'bg-amber-500'
        };
      default:
        return {
          label: 'Consultor',
          color: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-400'
        };
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'EX';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="h-10 w-10 text-teal-500 animate-spin" />
        <p className="text-slate-500 font-bold text-sm">Carregando dados da sua consultoria...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Building2 className="h-8 w-8 text-teal-500" />
          Configurações da Empresa
        </h1>
        <p className="text-slate-500 font-medium mt-1">Gerencie os dados da consultoria e os acessos ao sistema Antigravity.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-teal-50 border border-teal-200 p-4 text-teal-700 animate-in slide-in-from-top-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: Company Profile */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Main Card */}
          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 bg-gradient-to-br from-teal-100 to-orange-50 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex items-center gap-5 relative z-10">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center font-black text-white shadow-xl shadow-teal-500/20 text-2xl border border-teal-400/30">
                {getInitials(tenant?.name || '')}
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">{tenant?.name}</h3>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Workspace Principal</span>
              </div>
            </div>

            <div className="mt-8 space-y-5 relative z-10">
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CNPJ</span>
                  <span className="font-bold text-slate-700">{tenant?.cnpj || 'Não configurado'}</span>
                </div>
                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                  <Building2 className="h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Subdomínio (Slug)</span>
                  <span className="font-bold text-teal-600">{tenant?.slug}</span>
                </div>
                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 shadow-xl text-white relative overflow-hidden">
            <div className="absolute right-0 bottom-0 -mb-10 -mr-10 h-40 w-40 rounded-full bg-teal-500/20 blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <Award className="h-5 w-5 text-amber-400" />
                <span className="text-sm font-bold text-slate-300">Plano Profissional Ilimitado</span>
              </div>
              
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contas de Acesso Ativas</h4>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-5xl font-black tracking-tight">{users.length}</span>
                <span className="text-sm font-bold text-emerald-400">/ ∞</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: System Users */}
        <div className="xl:col-span-2">
          <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                  <Users className="h-6 w-6 text-slate-800" />
                  Acessos ao Sistema
                </h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Gerencie quem pode fazer login e o nível de permissão.</p>
              </div>
              <span className="text-xs font-bold bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-slate-500 shrink-0">
                {users.length} Registrados
              </span>
            </div>

            <div className="space-y-3">
              {users.map((member) => {
                const badge = getRoleBadge(member.role);
                return (
                  <div key={member.id} className="group bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-2xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/60 flex items-center justify-center font-black text-slate-700 shadow-sm">
                        {getInitials(member.name)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-base flex items-center gap-2">
                          {member.name}
                          {member.id === me?.id && (
                            <span className="text-[10px] font-black uppercase bg-teal-500 text-white px-2 py-0.5 rounded-full shadow-sm">Você</span>
                          )}
                        </p>
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Mail className="h-3.5 w-3.5" />
                          {member.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                      
                      <div className="flex items-center gap-1 text-xs font-medium text-slate-400">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(member.createdAt).toLocaleDateString('pt-BR')}
                      </div>

                      <div className="flex items-center">
                        {me?.role === 'ADMIN' && member.id !== me.id ? (
                          <div className="relative">
                            <select 
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.id, e.target.value as any)}
                              disabled={updatingUserId === member.id}
                              className={`appearance-none outline-none cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors pr-8 ${badge.color}`}
                            >
                              <option value="ADMIN" className="text-slate-900">Administrador</option>
                              <option value="LEADER" className="text-slate-900">Líder</option>
                              <option value="CONSULTANT" className="text-slate-900">Consultor</option>
                            </select>
                            <Shield className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 opacity-50 pointer-events-none" />
                          </div>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${badge.color}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`}></span>
                            {badge.label}
                          </span>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
