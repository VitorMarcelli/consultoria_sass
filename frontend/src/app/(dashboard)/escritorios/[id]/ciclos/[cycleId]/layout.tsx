'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import React, { use, useEffect, useState } from 'react';
import { ChevronLeft, Filter } from 'lucide-react';
import { apiRequest } from '@/utils/api';

const cycleTabs = [
  { id: 'visao-geral', label: 'Visão Geral', path: '' },
  { id: 'equipe', label: 'Equipe Alocada', path: '/equipe' },
  { id: 'clientes', label: 'Base de Clientes', path: '/clientes' },
  { id: 'entregas', label: 'Entregas Mensais', path: '/entregas' },
];

export default function CycleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string; cycleId: string }>;
}) {
  const { id, cycleId } = use(params);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentFrontId = searchParams.get('frontId') || '';
  const currentSubdivisionId = searchParams.get('subdivisionId') || '';

  const [fronts, setFronts] = useState<any[]>([]);

  useEffect(() => {
    const fetchFronts = async () => {
      try {
        const data = await apiRequest(`/structures/fronts?tenantId=${id}`);
        setFronts(data);
      } catch (err) {
        console.error('Failed to fetch fronts', err);
      }
    };
    fetchFronts();
  }, [id]);

  // Determine active tab
  const currentPath = pathname.replace(`/escritorios/${id}/ciclos/${cycleId}`, '');
  const currentTab = cycleTabs.find(t => t.path === currentPath) || cycleTabs[0];

  const handleFrontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFrontId = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (newFrontId) {
      params.set('frontId', newFrontId);
    } else {
      params.delete('frontId');
    }
    params.delete('subdivisionId');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSubdivisionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSubId = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (newSubId) {
      params.set('subdivisionId', newSubId);
    } else {
      params.delete('subdivisionId');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const selectedFront = fronts.find(f => f.id === currentFrontId);
  const subdivisions = selectedFront?.subdivisions || [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <Link 
              href={`/escritorios/${id}/ciclos`}
              className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestão do Ciclo Mensal</h1>
              <p className="text-sm font-medium text-slate-500 mt-1">ID: <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{cycleId}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <Filter className="w-4 h-4 text-slate-400 ml-2" />
              <select 
                value={currentFrontId} 
                onChange={handleFrontChange}
                className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer pr-8"
              >
                <option value="">Todas as Frentes</option>
                {fronts.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            {currentFrontId && (
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                <select 
                  value={currentSubdivisionId} 
                  onChange={handleSubdivisionChange}
                  className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer pr-8"
                >
                  <option value="">Todas as Células</option>
                  {subdivisions.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {cycleTabs.map((tab) => {
            const isActive = tab.id === currentTab.id;
            const queryParams = searchParams.toString() ? `?${searchParams.toString()}` : '';

            return (
              <Link 
                key={tab.id}
                href={`/escritorios/${id}/ciclos/${cycleId}${tab.path}${queryParams}`}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
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

      <div className="min-h-[500px]">
        {children}
      </div>
    </div>
  );
}
