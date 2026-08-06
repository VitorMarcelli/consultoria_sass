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
    ]
  },
  {
    title: 'Operação',
    items: [
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

  const menuGroups = [
    {
      title: 'Parâmetros',
      items: [
        { id: 'cadastro', label: 'Dados' },
        { id: 'frentes', label: 'Frentes' },
        { id: 'estruturas', label: 'Células' },
      ]
    },
    {
      title: 'Operação',
      items: [
        { id: 'ciclos', label: 'Gestão de Ciclos' },
      ]
    },
    {
      title: 'Resultados',
      items: [
        { id: 'painel', label: 'Painel Gerencial' },
      ]
    }
  ];

  return (
    <div className="space-y-0 w-full max-w-[1800px] mx-auto pb-12">
      {/* Top Header - Transparent & Sleek */}
      <div className="mb-10 px-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{tenantName}</h1>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${statusInfo.colors.replace('100', '50').replace('200', '200')} bg-white shadow-sm`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.colors.split(' ')[0].replace('bg-', 'bg-').replace('100', '500')} animate-pulse`}></span>
              <span className="text-[10px] font-bold uppercase tracking-wider">{statusInfo.label}</span>
            </div>
          </div>
          {tenantCnpj && (
            <p className="text-sm font-medium text-slate-500 mt-2">
              CNPJ: <span className="text-slate-700">{tenantCnpj}</span>
            </p>
          )}
        </div>
        
        <div className="bg-teal-50/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-teal-100/50 shadow-sm">
          <p className="text-sm font-bold text-teal-700 flex items-center gap-2">
            <Check className="w-4 h-4" />
            Mapeamento da Operação
          </p>
        </div>
      </div>

      {/* Grouped Folder Tabs Navigation */}
      <div className="flex px-4 gap-8 overflow-x-auto custom-scrollbar relative z-10 pt-4">
        {menuGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="flex flex-col relative">
            {/* Group Title floating above the tabs */}
            <span className="absolute -top-5 left-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              {group.title}
            </span>
            <div className="flex gap-1.5">
              {group.items.map((tab) => {
                const isActive = tab.id === currentTabId;

                return (
                  <Link 
                    key={tab.id}
                    href={`/escritorios/${id}/${tab.id}`}
                    className={`relative px-6 py-3.5 font-bold text-sm transition-colors duration-300 flex items-center justify-center min-w-[110px] whitespace-nowrap ${
                      isActive 
                        ? 'bg-white text-teal-600 z-20 rounded-t-2xl' 
                        : 'bg-slate-200/60 text-slate-500 hover:bg-slate-200 hover:text-slate-800 z-0 rounded-t-xl mt-1.5'
                    }`}
                  >
                    {tab.label}
                    
                    {/* Seamless Inverted Curves for Active Tab */}
                    {isActive && (
                      <>
                        <div className="absolute bottom-0 -left-4 w-4 h-4 bg-transparent rounded-br-2xl shadow-[6px_6px_0_6px_white] pointer-events-none"></div>
                        <div className="absolute bottom-0 -right-4 w-4 h-4 bg-transparent rounded-bl-2xl shadow-[-6px_6px_0_6px_white] pointer-events-none"></div>
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area - Visually connected to the active tab */}
      <div className="bg-white rounded-b-3xl rounded-tr-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative z-20 border border-slate-100 min-h-[500px]">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
