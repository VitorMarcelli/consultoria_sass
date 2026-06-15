'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
import React from 'react';

const menuGroups = [
  {
    title: 'Parâmetros',
    items: [
      { id: 'cadastro', label: 'Dados', icon: '1.1' },
      { id: 'frentes', label: 'Frentes', icon: '1.2' },
      { id: 'estruturas', label: 'Células', icon: '1.3' },
      { id: 'ciclos', label: 'Gestão de Ciclos', icon: '1.5' },
    ]
  },
  {
    title: 'Resultados',
    items: [
      { id: 'painel', label: 'Painel Gerencial', icon: '3.1' },
    ]
  }
];

export default function EscritorioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const pathname = usePathname();
  // Example pathname: /escritorios/1/cadastro
  const currentTabId = pathname.split('/').pop() || 'cadastro';
  
  const [role, setRole] = React.useState<string | null>(null);
  const [tenantName, setTenantName] = React.useState<string>('Configuração do Escritório');
  const [tenantCnpj, setTenantCnpj] = React.useState<string>('');
  const [tenantStatus, setTenantStatus] = React.useState<string>('PREPARATION');

  const [systemOptions, setSystemOptions] = React.useState<any[]>([]);

  React.useEffect(() => {
    import('@/utils/api').then(({ apiRequest }) => {
      apiRequest(`/tenants/${id}`)
        .then(data => {
          if (data?.name) setTenantName(data.name);
          if (data?.cnpj) setTenantCnpj(data.cnpj);
          if (data?.status) setTenantStatus(data.status);
        })
        .catch(console.error);

      apiRequest('/users/me')
        .then(data => setRole(data?.role || 'CONSULTANT'))
        .catch(() => setRole('CONSULTANT'));

      apiRequest('/system-options')
        .then(data => setSystemOptions(data || []))
        .catch(() => setSystemOptions([]));
    });
  }, [id]);

  const getStatusLabel = (status: string) => {
    const dynamicOption = systemOptions.find(o => o.category === 'TENANT_STATUS' && o.value === status);
    if (dynamicOption) {
      const baseColor = dynamicOption.color || 'slate';
      return { 
        label: dynamicOption.label, 
        colors: `bg-${baseColor}-100 text-${baseColor}-700 border-${baseColor}-200` 
      };
    }

    switch (status) {
      case 'ACTIVE': return { label: 'Ativo', colors: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'MAPPING': return { label: 'Mapeamento', colors: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 'INACTIVE': return { label: 'Inativo', colors: 'bg-slate-100 text-slate-600 border-slate-200' };
      default: return { label: 'Preparação', colors: 'bg-blue-100 text-blue-700 border-blue-200' };
    }
  };

  const statusInfo = getStatusLabel(tenantStatus);

  // Todos (Admin, Lider, Consultor) podem ver o Painel Gerencial de seus próprios escritórios
  const filteredMenuGroups = menuGroups;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-6">
        <div className="mb-8 pb-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{tenantName}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${statusInfo.colors}`}>
                {statusInfo.label}
              </span>
            </div>
            {tenantCnpj && (
              <p className="text-sm font-medium text-slate-500 mt-2">
                CNPJ: <span className="text-slate-600">{tenantCnpj}</span>
              </p>
            )}
          </div>
          <div className="bg-teal-50 px-4 py-2 rounded-xl border border-teal-100">
            <p className="text-sm font-bold text-teal-700">Mapeamento da Operação</p>
          </div>
        </div>

        {/* Grouped Stepper Navigation */}
        <div className="flex flex-wrap gap-8 overflow-x-auto pb-2 custom-scrollbar">
          {filteredMenuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="flex flex-col gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">{group.title}</span>
              <div className="flex items-center gap-2">
                {group.items.map((tab) => {
                  const isActive = tab.id === currentTabId;

                  return (
                    <Link 
                      key={tab.id}
                      href={`/escritorios/${id}/${tab.id}`}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                        isActive 
                          ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20' 
                          : 'bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {currentTabId === 'painel' ? (
        <div className="min-h-[500px]">
          {children}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 min-h-[500px]">
          {children}
        </div>
      )}
    </div>
  );
}
