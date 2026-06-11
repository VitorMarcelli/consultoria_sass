'use client';

import { Search, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import NotificationDropdown from './NotificationDropdown';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const pathname = usePathname();
  
  const pageName = pathname === '/' 
    ? 'Visão Geral' 
    : pathname.split('/')[1].charAt(0).toUpperCase() + pathname.split('/')[1].slice(1);

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between bg-white px-6 lg:px-10">
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleSidebar}
          className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
            <span>Sevilha Performance</span>
            <span className="text-slate-300">/</span>
            <span className="text-teal-600 font-semibold">Escritório Alpha</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700">{pageName}</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{pageName}</h2>
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
