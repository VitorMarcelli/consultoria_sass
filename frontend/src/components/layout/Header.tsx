'use client';

import { Search, Menu, ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import Link from 'next/link';
import NotificationDropdown from './NotificationDropdown';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

const mapLabels: Record<string, string> = {
  'escritorios': 'Escritórios',
  'clientes': 'Clientes',
  'configuracoes': 'Configurações',
  'empresa': 'Empresa',
  'entregas': 'Entregas',
  'equipe': 'Equipe',
  'cadastro': 'Cadastro',
  'ciclos': 'Ciclos',
  'colaboradores': 'Colaboradores',
  'estruturas': 'Estruturas',
  'frentes': 'Frentes de Atuação',
  'painel': 'Painel',
  'imports': 'Importações',
  'relatorios': 'Relatórios'
};

export default function Header({ onToggleSidebar }: HeaderProps) {
  const pathname = usePathname();
  const [officeName, setOfficeName] = useState<string>('');
  
  const pathParts = pathname.split('/').filter(Boolean);
  const isOfficeContext = pathParts[0] === 'escritorios' && pathParts.length > 1;
  const officeId = isOfficeContext ? pathParts[1] : null;

  useEffect(() => {
    if (officeId) {
      apiRequest(`/tenants/${officeId}`)
        .then(res => {
          if (res && res.name) setOfficeName(res.name);
        })
        .catch(console.error);
    } else {
      setOfficeName('');
    }
  }, [officeId]);

  const breadcrumbs = [];
  breadcrumbs.push({ label: 'Sevilha Performance', href: '/' });

  let currentPath = '';
  pathParts.forEach((part, index) => {
    currentPath += `/${part}`;
    
    let label = mapLabels[part] || (part.charAt(0).toUpperCase() + part.slice(1));
    
    // Se for o ID do escritório, substituir pelo nome
    if (isOfficeContext && index === 1) {
      label = officeName || 'Carregando...';
    }

    breadcrumbs.push({ label, href: currentPath });
  });

  const pageName = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 1].label : 'Visão Geral';

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between bg-white px-6 lg:px-10">
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleSidebar}
          className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex flex-col justify-center mt-1">
          <nav className="flex items-center text-[13px] font-medium text-slate-500 mb-1.5 overflow-hidden whitespace-nowrap">
            {breadcrumbs.map((bc, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <div key={bc.href} className="flex items-center">
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-300" />}
                  <Link 
                    href={bc.href}
                    className={`transition-colors hover:text-teal-600 ${
                      isLast ? 'text-teal-600 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {bc.label}
                  </Link>
                </div>
              );
            })}
          </nav>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 leading-none">{pageName}</h2>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar clientes..." 
            className="h-10 w-64 rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
          />
        </div>

        <NotificationDropdown />
      </div>
    </header>
  );
}
